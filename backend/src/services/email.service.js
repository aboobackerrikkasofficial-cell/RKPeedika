import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 're_placeholder');

const STORE_NAME = 'RK Peedika';
const FROM_EMAIL = `RK Peedika <onboarding@resend.dev>`; // Resend testing email 

export const sendOrderConfirmationEmail = async (order, items, email) => {
  if (!email || !process.env.RESEND_API_KEY) return; 

  try {
    const itemsListHtml = items.map(item => 
      `<li>${item.quantity}x ${item.productName} - ₹${item.price}</li>`
    ).join('');

    const htmlContent = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #0B1B2B;">Order Confirmed! 🎉</h2>
        <p>Hi ${order.shippingName || 'Customer'},</p>
        <p>Thank you for shopping with <strong>${STORE_NAME}</strong>. We've received your order and are getting it ready for you.</p>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; font-size: 16px;">Order Summary (ID: ${order.orderId})</h3>
          <ul style="padding-left: 20px; line-height: 1.6;">
            ${itemsListHtml}
          </ul>
          <p style="font-weight: bold; margin-bottom: 0;">Total Amount: ₹${order.amount}</p>
        </div>

        <div style="margin-bottom: 20px;">
          <h3 style="font-size: 16px;">Delivery Details:</h3>
          <p style="margin: 0;">${order.shippingStreet}</p>
          <p style="margin: 0;">${order.shippingCity}, ${order.shippingState} - ${order.shippingPincode}</p>
          <p style="margin-top: 10px;"><strong>Estimated Delivery:</strong> ${order.estimatedDelivery ? new Date(order.estimatedDelivery).toLocaleDateString('en-IN') : '3-5 Business Days'}</p>
        </div>

        <p>We'll notify you once your order has been shipped.</p>
        <p>Best regards,<br/>The ${STORE_NAME} Team</p>
      </div>
    `;

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `Your ${STORE_NAME} order #${order.orderId} is confirmed`,
      html: htmlContent,
    });
    if (error) {
      console.error('Resend API Error (Order Confirmation):', error);
    } else {
      console.log(`Order confirmation email sent to ${email} for order ${order.orderId}`);
    }
  } catch (err) {
    console.error('Exception sending order confirmation email:', err);
  }
};

export const sendOrderStatusEmail = async (order, email) => {
  if (!email || !process.env.RESEND_API_KEY) return;

  try {
    const htmlContent = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #0B1B2B;">Order Update</h2>
        <p>Hi ${order.shippingName || 'Customer'},</p>
        <p>The status of your order <strong>#${order.orderId}</strong> has been updated to: <strong style="text-transform: capitalize;">${order.status.replace(/_/g, ' ')}</strong>.</p>
        <p>Thank you for shopping with ${STORE_NAME}!</p>
      </div>
    `;

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `Update on your ${STORE_NAME} order #${order.orderId}`,
      html: htmlContent,
    });
    if (error) {
      console.error('Resend API Error (Order Status):', error);
    } else {
      console.log(`Order status email sent to ${email} for order ${order.orderId}`);
    }
  } catch (err) {
    console.error('Exception sending order status email:', err);
  }
};
