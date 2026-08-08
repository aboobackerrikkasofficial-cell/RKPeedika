import express from 'express';
import { PrismaClient } from '@prisma/client';
import { catchAsync } from '../utils/appError.js';
import upload from '../middleware/upload.js';

const router = express.Router();
const prisma = new PrismaClient();

// Create new exchange request with image uploads
router.post('/', upload.array('images', 5), catchAsync(async (req, res) => {
  const { orderId, customerName, phone, reason, notes } = req.body;
  const files = req.files;

  if (!orderId || !customerName || !phone || !reason) {
    return res.status(400).json({ status: 'fail', message: 'Please provide all required fields.' });
  }

  if (!files || files.length === 0) {
    return res.status(400).json({ status: 'fail', message: 'Image upload is mandatory for exchange requests.' });
  }

  // Extract filenames from uploaded files
  const images = files.map(file => `/uploads/${file.filename}`);

  // Save exchange request in DB
  const exchangeRequest = await prisma.exchangeRequest.create({
    data: {
      orderId,
      customerName,
      phone,
      reason,
      notes: notes || '',
      images: JSON.stringify(images),
      status: 'pending'
    }
  });

  res.status(201).json({
    status: 'success',
    data: exchangeRequest,
    message: 'Exchange request submitted successfully.'
  });
}));

export default router;
