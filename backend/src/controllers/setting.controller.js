import prisma from '../config/db.js';
import { BadRequestError } from '../utils/appError.js';

export const getSettings = async (req, res, next) => {
  try {
    let settings = await prisma.storeSetting.findUnique({
      where: { id: 'default' }
    });

    if (!settings) {
      settings = await prisma.storeSetting.create({
        data: { id: 'default' }
      });
    }

    res.status(200).json({ status: 'success', data: settings });
  } catch (error) {
    next(error);
  }
};

export const updateSettings = async (req, res, next) => {
  try {
    const {
      storeName,
      storeLogo,
      storeEmail,
      supportEmail,
      supportPhone,
      whatsappNumber,
      gstNumber,
      footerContent,
      instagramLink,
      facebookLink,
      returnPolicy,
      privacyPolicy,
      termsConditions,
      announcementBar,
      onlineDiscount,
      shippingCharges,
      businessName,
      businessAddress,
      supportHours,
      returnPolicyWindow,
      exchangeWindow,
      cancellationRules,
      refundRules,
      damagedProductRules,
      photoRequirement,
      nonReturnableConditions,
      processingTime
    } = req.body;

    const dataPayload = {
      storeName, storeLogo, storeEmail, supportEmail, supportPhone, whatsappNumber, gstNumber,
      footerContent, instagramLink, facebookLink, returnPolicy, privacyPolicy, termsConditions,
      announcementBar, 
      onlineDiscount: onlineDiscount !== undefined ? Number(onlineDiscount) : undefined,
      shippingCharges: shippingCharges !== undefined ? Number(shippingCharges) : undefined,
      businessName, businessAddress, supportHours,
      returnWindow: returnPolicyWindow !== undefined ? Number(returnPolicyWindow) : undefined,
      exchangeWindow: exchangeWindow !== undefined ? Number(exchangeWindow) : undefined,
      cancellationRules, refundRules, damagedProductRules, 
      photoRequirement: photoRequirement !== undefined ? Boolean(photoRequirement) : undefined,
      nonReturnableConditions, processingTime
    };

    // Clean undefined values
    Object.keys(dataPayload).forEach(key => dataPayload[key] === undefined && delete dataPayload[key]);

    const settings = await prisma.storeSetting.upsert({
      where: { id: 'default' },
      update: dataPayload,
      create: {
        id: 'default',
        ...dataPayload
      }
    });

    res.status(200).json({ status: 'success', data: settings, message: 'Settings updated successfully' });
  } catch (error) {
    next(error);
  }
};
