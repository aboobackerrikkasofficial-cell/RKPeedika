import nodemailer from 'nodemailer';
import logger from '../utils/logger.js';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.mailtrap.io',
  port: Number(process.env.EMAIL_PORT) || 2525,
  auth: {
    user: process.env.EMAIL_USER || 'mock_user',
    pass: process.env.EMAIL_PASS || 'mock_pass'
  }
});

export const sendEmail = async ({ to, subject, html }) => {
  try {
    if (process.env.EMAIL_USER === 'mock_user' || !process.env.EMAIL_USER) {
      logger.info(`Simulated email sent successfully. To: ${to} | Subject: ${subject}`);
      return { messageId: `mock_${Date.now()}` };
    }

    const info = await transporter.sendMail({
      from: `"Kriti Marketplace" <no-reply@kritimarketplace.com>`,
      to,
      subject,
      html
    });

    logger.info(`Email dispatched successfully. Msg ID: ${info.messageId}`);
    return info;
  } catch (error) {
    logger.error(`Nodemailer dispatch failed: ${error.message}`);
    throw error;
  }
};
