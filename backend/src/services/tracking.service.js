import axios from 'axios';
import prisma from '../config/db.js';
import logger from '../utils/logger.js';

// In-memory cache for throttling sync calls (15 minutes limit per order)
const lastSyncMap = new Map();
const SYNC_THROTTLE_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Extracts tracking number and courier from a URL or raw string.
 * Supports various formats (SF Express, 17track, DHL, FedEx, UPS, etc.)
 */
export const parseTrackingLinkOrNumber = (input) => {
  if (!input) return { trackingNumber: '', courier: '' };
  
  let trackingNumber = input.trim();
  let courier = '';

  // Check if it is a URL
  if (trackingNumber.startsWith('http://') || trackingNumber.startsWith('https://')) {
    try {
      const url = new URL(trackingNumber);
      
      // Try to extract tracking number from query params
      if (url.hash && url.hash.includes('nums=')) {
        const match = url.hash.match(/nums=([A-Za-z0-9]+)/);
        if (match) trackingNumber = match[1];
      } else if (url.searchParams.has('nums')) {
        trackingNumber = url.searchParams.get('nums') || '';
      } else if (url.searchParams.has('trackNo')) {
        trackingNumber = url.searchParams.get('trackNo') || '';
      } else if (url.searchParams.has('orderId')) {
        trackingNumber = url.searchParams.get('orderId') || '';
      } else if (url.searchParams.has('waybill')) {
        trackingNumber = url.searchParams.get('waybill') || '';
      } else if (url.searchParams.has('id')) {
        trackingNumber = url.searchParams.get('id') || '';
      } else {
        // Fallback: extract last alphanumeric segment of path
        const pathSegments = url.pathname.split('/').filter(Boolean);
        if (pathSegments.length > 0) {
          const lastSegment = pathSegments[pathSegments.length - 1];
          if (/^[A-Za-z0-9_\-]+$/.test(lastSegment)) {
            trackingNumber = lastSegment;
          }
        }
      }
      
      // Detect courier from hostname
      const host = url.hostname.toLowerCase();
      if (host.includes('sf-express') || host.includes('sf-international')) {
        courier = 'SF Express';
      } else if (host.includes('shadowfax')) {
        courier = 'Shadowfax';
      } else if (host.includes('delhivery')) {
        courier = 'Delhivery';
      } else if (host.includes('valmo')) {
        courier = 'Valmo';
      } else if (host.includes('ekart')) {
        courier = 'Ekart Logistics';
      } else if (host.includes('xpressbees')) {
        courier = 'Xpressbees';
      } else if (host.includes('bluedart')) {
        courier = 'Blue Dart';
      } else if (host.includes('dhl')) {
        courier = 'DHL';
      } else if (host.includes('fedex')) {
        courier = 'FedEx';
      } else if (host.includes('ups')) {
        courier = 'UPS';
      }
    } catch (e) {
      // Not a valid URL, treat as tracking number
    }
  }

  // Detect courier from tracking number pattern if not set
  if (!courier && trackingNumber) {
    const cleanNum = trackingNumber.toUpperCase();
    if (/^SF\d{10,15}[A-Z]*$/.test(cleanNum) || /^SF\d+$/.test(cleanNum)) {
      courier = 'Shadowfax'; // Shadowfax AWBs often start with SF
    } else if (/^VL\d+$/.test(cleanNum)) {
      courier = 'Valmo';
    } else if (/^FMPP\d+$/.test(cleanNum)) {
      courier = 'Ekart Logistics';
    } else if (/^\d{12}$/.test(cleanNum)) {
      courier = 'Delhivery';
    } else if (/^1Z[A-Z0-9]{16}$/.test(cleanNum)) {
      courier = 'UPS';
    }
  }

  return { trackingNumber, courier };
};

/**
 * Maps TrackingMore checkpoint status to RK Peedika internal status.
 */
const mapCheckpointStatus = (tmStatus) => {
  const status = (tmStatus || '').toLowerCase();
  switch (status) {
    case 'pending':
      return 'confirmed';
    case 'transit':
      return 'shipped';
    case 'pickup':
      return 'out_for_delivery';
    case 'delivered':
      return 'delivered';
    case 'exception':
    case 'undelivered':
      return 'failed';
    default:
      return 'on_the_way';
  }
};

/**
 * Normalizes courier names to TrackingMore code slugs.
 */
const getCourierCode = (courierName, trackingNumber) => {
  const name = (courierName || '').toLowerCase().trim();
  const num = (trackingNumber || '').toUpperCase().trim();

  if (name.includes('sf') || name.includes('shunfeng') || num.startsWith('SF')) {
    return 'sf-express';
  }
  if (name.includes('dhl')) {
    return 'dhl';
  }
  if (name.includes('fedex')) {
    return 'fedex';
  }
  if (name.includes('ups')) {
    return 'ups';
  }
  if (name.includes('usps')) {
    return 'usps';
  }
  if (name.includes('delhivery')) {
    return 'delhivery';
  }
  if (name.includes('dtdc')) {
    return 'dtdc';
  }
  if (name.includes('ekart') || name.includes('flipkart')) {
    return 'ekart';
  }
  if (name.includes('shadowfax')) {
    return 'shadowfax';
  }
  if (name.includes('blue dart') || name.includes('bluedart')) {
    return 'bluedart';
  }
  if (name.includes('xpressbees')) {
    return 'xpressbees';
  }

  return name || null;
};

/**
 * Synchronizes tracking events from TrackingMore API.
 */
export const syncTracking = async (orderId, force = false) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { trackingEvents: true }
    });

    if (!order) {
      logger.error(`[TRACKING SYNC] Order ${orderId} not found`);
      return null;
    }

    if (!order.trackingNumber) {
      logger.info(`[TRACKING SYNC] Order ${orderId} has no tracking number. Skipping.`);
      return order;
    }

    // Check throttle to save API usage
    const lastSync = lastSyncMap.get(orderId);
    if (!force && lastSync && Date.now() - lastSync < SYNC_THROTTLE_MS) {
      logger.info(`[TRACKING SYNC] Throttled. Last synced: ${new Date(lastSync).toISOString()}`);
      return order;
    }

    const apiKey = process.env.TRACKINGMORE_API_KEY;
    if (!apiKey) {
      logger.warn(`[TRACKING SYNC] TRACKINGMORE_API_KEY is not configured. Falling back to simulated tracking.`);
      return order;
    }

    let courierCode = getCourierCode(order.courier, order.trackingNumber);
    
    const headers = {
      'Tracking-Api-Key': apiKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    // 1. Auto-detect courier if unknown
    if (!courierCode) {
      try {
        logger.info(`[TRACKING SYNC] Courier unknown for ${order.trackingNumber}. Detecting courier...`);
        const detectRes = await axios.post(
          'https://api.trackingmore.com/v4/couriers/detect',
          { tracking_number: order.trackingNumber },
          { headers, timeout: 5000 }
        );

        if (detectRes.data && detectRes.data.data && detectRes.data.data.length > 0) {
          courierCode = detectRes.data.data[0].courier_code;
          logger.info(`[TRACKING SYNC] Automatically detected courier: ${courierCode}`);
        }
      } catch (err) {
        logger.error(`[TRACKING SYNC] Courier detection failed: ${err.message}`);
      }
    }

    if (!courierCode) {
      courierCode = 'express'; // fallback generic code
    }

    let trackingData = null;

    // 2. Try fetching tracking details
    try {
      logger.info(`[TRACKING SYNC] Querying TrackingMore for ${order.trackingNumber} (${courierCode})`);
      const getRes = await axios.get(
        `https://api.trackingmore.com/v4/trackings/get?tracking_numbers=${order.trackingNumber}&courier_code=${courierCode}`,
        { headers, timeout: 5000 }
      );

      if (getRes.data && getRes.data.data && getRes.data.data.length > 0) {
        trackingData = getRes.data.data[0];
      }
    } catch (err) {
      // If error or 404/not registered, we will attempt to register below
      logger.info(`[TRACKING SYNC] Tracking not found on TrackingMore. Registering waybill...`);
    }

    // 3. Register tracking if not found/registered
    if (!trackingData) {
      try {
        const postRes = await axios.post(
          'https://api.trackingmore.com/v4/trackings/post',
          {
            tracking_number: order.trackingNumber,
            courier_code: courierCode,
            order_number: order.orderId || order.id
          },
          { headers, timeout: 5000 }
        );

        if (postRes.data && postRes.data.data) {
          trackingData = postRes.data.data;
          logger.info(`[TRACKING SYNC] Waybill registered successfully.`);
        }
      } catch (err) {
        // If it was already registered (code 4101), retry getting it
        if (err.response?.data?.meta?.code === 4101) {
          logger.info(`[TRACKING SYNC] Waybill was already registered in TrackingMore.`);
          try {
            const retryRes = await axios.get(
              `https://api.trackingmore.com/v4/trackings/get?tracking_numbers=${order.trackingNumber}&courier_code=${courierCode}`,
              { headers, timeout: 5000 }
            );
            if (retryRes.data && retryRes.data.data && retryRes.data.data.length > 0) {
              trackingData = retryRes.data.data[0];
            }
          } catch (retryErr) {
            logger.error(`[TRACKING SYNC] Retry fetch failed: ${retryErr.message}`);
          }
        } else {
          logger.error(`[TRACKING SYNC] Waybill registration failed: ${err.message}`);
        }
      }
    }

    // 4. Update order & tracking events with checkpoints if available
    if (trackingData && trackingData.trackinfo && trackingData.trackinfo.length > 0) {
      logger.info(`[TRACKING SYNC] Processing ${trackingData.trackinfo.length} checkpoints.`);
      
      const checkpoints = trackingData.trackinfo; // typically ascending or descending
      
      // Map checkpoints to system tracking events
      const systemEvents = checkpoints.map((cp, idx) => {
        const mappedStatus = mapCheckpointStatus(cp.checkpoint_delivery_status || cp.checkpoint_delivery_substatus);
        const locationStr = cp.location ? `[${cp.location}] ` : '';
        const message = `${locationStr}${cp.tracking_detail || 'Package in transit'}`;
        
        return {
          status: mappedStatus,
          message,
          eventDate: new Date(cp.checkpoint_date || Date.now()),
          createdBy: 'system'
        };
      });

      // Get unique latest event or status
      const latestTMEvent = systemEvents.reduce((latest, current) => {
        return new Date(current.eventDate) > new Date(latest.eventDate) ? current : latest;
      }, systemEvents[0]);

      const latestStatus = latestTMEvent ? latestTMEvent.status : order.status;
      const latestMessage = latestTMEvent ? latestTMEvent.message : order.customerStatusMessage;

      // Determine date specific triggers
      const shippedEvent = systemEvents.find(e => e.status === 'shipped');
      const deliveredEvent = systemEvents.find(e => e.status === 'delivered');
      
      const shippedAtDate = shippedEvent ? new Date(shippedEvent.eventDate) : undefined;
      const deliveredAtDate = deliveredEvent ? new Date(deliveredEvent.eventDate) : undefined;

      // Update in a transaction
      await prisma.$transaction([
        // Delete previous system events
        prisma.orderTrackingEvent.deleteMany({
          where: {
            orderId: order.id,
            createdBy: 'system'
          }
        }),
        // Add new system events
        prisma.orderTrackingEvent.createMany({
          data: systemEvents.map(evt => ({
            orderId: order.id,
            status: evt.status,
            message: evt.message,
            eventDate: evt.eventDate,
            createdBy: 'system'
          }))
        }),
        // Update Order master status
        prisma.order.update({
          where: { id: order.id },
          data: {
            status: latestStatus,
            customerStatusMessage: latestMessage,
            courier: order.courier || courierCode, // save courier slug back to DB
            ...(shippedAtDate && { shippedAt: shippedAtDate }),
            ...(deliveredAtDate && { deliveredAt: deliveredAtDate })
          }
        })
      ]);

      lastSyncMap.set(orderId, Date.now());
      logger.info(`[TRACKING SYNC] Order ${orderId} synced successfully.`);

      // Fetch the updated order to return
      return await prisma.order.findUnique({
        where: { id: orderId },
        include: { trackingEvents: { orderBy: { eventDate: 'desc' } } }
      });
    }

    return order;
  } catch (error) {
    logger.error(`[TRACKING SYNC ERROR] Order ${orderId} sync failed: ${error.message}`);
    // Return original order on failure to avoid blocking customer app
    return await prisma.order.findUnique({
      where: { id: orderId },
      include: { trackingEvents: { orderBy: { eventDate: 'desc' } } }
    });
  }
};
