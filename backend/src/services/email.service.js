import { Resend } from 'resend';
import nodemailer from 'nodemailer';

const resend = new Resend(process.env.RESEND_API_KEY || 're_placeholder');

// Gmail Transporter Setup (Free alternative)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER, // e.g., yourname@gmail.com
    pass: process.env.GMAIL_APP_PASSWORD, // 16-character App Password
  },
});

const STORE_NAME = 'RK Peedika';
// Using the environment variable if they go live, falling back to the test onboarding email otherwise.
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || `RK Peedika <onboarding@resend.dev>`;

export const sendOrderConfirmationEmail = async (order, items, email) => {
  if (!email) return;

  const useGmail = !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
  
  if (!useGmail && !process.env.RESEND_API_KEY) {
    console.warn('Neither GMAIL credentials nor RESEND_API_KEY are configured. Email will not be sent to', email);
    return;
  }

  try {
    const itemsListHtml = items.map(item => `
      <tr>
        <td style="padding: 12px 15px; border-bottom: 1px solid #e0e0e0; font-size: 14px;">
          <div style="font-weight: 600; color: #212121;">${item.productName}</div>
          <div style="color: #878787; font-size: 12px; margin-top: 4px;">Qty: ${item.quantity}</div>
        </td>
        <td style="padding: 12px 15px; border-bottom: 1px solid #e0e0e0; font-size: 14px; text-align: right; font-weight: 600; color: #212121;">
          ₹${item.price}
        </td>
      </tr>
    `).join('');

    const htmlContent = `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #f0f0f0; border-radius: 8px; overflow: hidden; background-color: #ffffff;">
        
        <!-- Header -->
        <div style="background-color: #2874f0; padding: 25px 20px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; letter-spacing: 0.5px;">${STORE_NAME}</h1>
          <p style="color: #c9e0ff; margin: 8px 0 0 0; font-size: 14px;">Order Successfully Placed!</p>
        </div>

        <!-- Body content -->
        <div style="padding: 30px 25px;">
          <h2 style="margin: 0 0 15px 0; font-size: 18px; color: #212121;">Hi ${order.shippingName || 'Customer'},</h2>
          <p style="margin: 0 0 25px 0; color: #565656; font-size: 15px; line-height: 1.5;">
            Thank you for shopping with us! We have received your order <strong>#${order.orderId}</strong> and we're getting it ready for dispatch.
          </p>

          <!-- Order Summary Table -->
          <div style="border: 1px solid #e0e0e0; border-radius: 6px; overflow: hidden; margin-bottom: 25px;">
            <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
              <thead>
                <tr style="background-color: #f5f7fa;">
                  <th style="padding: 12px 15px; text-align: left; font-size: 13px; color: #878787; font-weight: 600; border-bottom: 1px solid #e0e0e0;">ITEM</th>
                  <th style="padding: 12px 15px; text-align: right; font-size: 13px; color: #878787; font-weight: 600; border-bottom: 1px solid #e0e0e0;">PRICE</th>
                </tr>
              </thead>
              <tbody>
                ${itemsListHtml}
                <!-- Total Row -->
                <tr style="background-color: #fdfdfd;">
                  <td style="padding: 15px; font-size: 15px; font-weight: 700; color: #212121; text-align: right;">Total Amount</td>
                  <td style="padding: 15px; font-size: 16px; font-weight: 700; color: #2874f0; text-align: right;">₹${order.amount}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Delivery & Payment Info -->
          <table width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 25px;">
            <tr>
              <td width="50%" style="vertical-align: top; padding-right: 15px;">
                <h3 style="margin: 0 0 8px 0; font-size: 14px; color: #878787; text-transform: uppercase; font-weight: 600;">Delivery Address</h3>
                <p style="margin: 0; color: #212121; font-size: 14px; line-height: 1.5; font-weight: 500;">
                  ${order.shippingStreet}<br>
                  ${order.shippingCity}, ${order.shippingState}<br>
                  Pincode: ${order.shippingPincode}
                </p>
              </td>
              <td width="50%" style="vertical-align: top; padding-left: 15px; border-left: 1px solid #e0e0e0;">
                <h3 style="margin: 0 0 8px 0; font-size: 14px; color: #878787; text-transform: uppercase; font-weight: 600;">Delivery Estimate</h3>
                <p style="margin: 0; color: #388e3c; font-size: 15px; font-weight: 600;">
                  ${order.estimatedDelivery ? new Date(order.estimatedDelivery).toLocaleDateString('en-IN') : '3-5 Business Days'}
                </p>
                <div style="margin-top: 15px;">
                  <span style="display: inline-block; background-color: ${String(order.paymentMethod).toUpperCase() === 'COD' ? '#fff3e0' : '#e8f5e9'}; color: ${String(order.paymentMethod).toUpperCase() === 'COD' ? '#e65100' : '#2e7d32'}; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: 600;">
                    ${String(order.paymentMethod).toUpperCase() === 'COD' ? 'Cash on Delivery' : 'Paid Online'}
                  </span>
                </div>
              </td>
            </tr>
          </table>

          <p style="margin: 0; color: #565656; font-size: 14px; line-height: 1.5; text-align: center; border-top: 1px solid #f0f0f0; padding-top: 20px;">
            We will notify you again once your order has been dispatched.
          </p>
        </div>

        <!-- Footer -->
        <div style="background-color: #f1f3f6; padding: 20px; text-align: center;">
          <p style="margin: 0; color: #878787; font-size: 12px;">Need help? Reply to this email or contact our support team.</p>
          <p style="margin: 6px 0 0 0; color: #878787; font-size: 12px;">© ${new Date().getFullYear()} ${STORE_NAME}. All rights reserved.</p>
        </div>
      </div>
    `;

    if (useGmail) {
      await transporter.sendMail({
        from: `"${STORE_NAME}" <${process.env.GMAIL_USER}>`,
        to: email,
        subject: `Order Confirmed: Your ${STORE_NAME} order #${order.orderId} has been successfully placed`,
        html: htmlContent,
      });
      console.log(`Order confirmation email sent via GMAIL to ${email} for order ${order.orderId}`);
    } else {
      const { data, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: email,
        subject: `Order Confirmed: Your ${STORE_NAME} order #${order.orderId} has been successfully placed`,
        html: htmlContent,
      });
      if (error) {
        console.error('Resend API Error (Order Confirmation):', error);
      } else {
        console.log(`Order confirmation email sent via RESEND to ${email} for order ${order.orderId}`);
      }
    }
  } catch (err) {
    console.error('Exception sending order confirmation email:', err);
  }
};

export const sendOrderStatusEmail = async (order, email) => {
  if (!email) return;

  const useGmail = !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
  
  if (!useGmail && !process.env.RESEND_API_KEY) {
    console.warn('Neither GMAIL credentials nor RESEND_API_KEY are configured. Status email will not be sent to', email);
    return;
  }

  try {
    const isDelivered = order.status.toLowerCase() === 'delivered';
    const accentColor = isDelivered ? '#388e3c' : '#2874f0';

    const htmlContent = `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #f0f0f0; border-radius: 8px; overflow: hidden; background-color: #ffffff;">
        
        <div style="background-color: ${accentColor}; padding: 20px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 600;">${STORE_NAME}</h1>
        </div>

        <div style="padding: 30px 25px;">
          <h2 style="margin: 0 0 15px 0; font-size: 18px; color: #212121;">Order Update</h2>
          <p style="margin: 0 0 20px 0; color: #565656; font-size: 15px; line-height: 1.5;">
            Hi ${order.shippingName || 'Customer'},<br><br>
            Great news! The status of your order <strong>#${order.orderId}</strong> has been updated.
          </p>
          
          <div style="background-color: #f5f7fa; padding: 20px; border-radius: 6px; text-align: center; margin-bottom: 25px;">
            <p style="margin: 0; font-size: 14px; color: #878787; text-transform: uppercase; font-weight: 600;">Current Status</p>
            <h3 style="margin: 8px 0 0 0; font-size: 20px; color: ${accentColor}; text-transform: capitalize;">
              ${order.status.replace(/_/g, ' ')}
            </h3>
          </div>

          <p style="margin: 0; color: #565656; font-size: 14px; line-height: 1.5; text-align: center;">
            Thank you for shopping with ${STORE_NAME}!
          </p>
        </div>
      </div>
    `;

    if (useGmail) {
      await transporter.sendMail({
        from: `"${STORE_NAME}" <${process.env.GMAIL_USER}>`,
        to: email,
        subject: `Update on your ${STORE_NAME} order #${order.orderId}`,
        html: htmlContent,
      });
      console.log(`Order status email sent via GMAIL to ${email} for order ${order.orderId}`);
    } else {
      const { data, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: email,
        subject: `Update on your ${STORE_NAME} order #${order.orderId}`,
        html: htmlContent,
      });
      if (error) {
        console.error('Resend API Error (Order Status):', error);
      } else {
        console.log(`Order status email sent via RESEND to ${email} for order ${order.orderId}`);
      }
    }
  } catch (err) {
    console.error('Exception sending order status email:', err);
  }
};
