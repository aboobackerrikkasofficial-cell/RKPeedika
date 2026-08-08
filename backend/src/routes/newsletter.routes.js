import express from 'express';
import { PrismaClient } from '@prisma/client';
import { catchAsync } from '../utils/appError.js';

const router = express.Router();
const prisma = new PrismaClient();

// Subscribe to newsletter
router.post('/subscribe', catchAsync(async (req, res) => {
  const { email } = req.body;

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ status: 'fail', message: 'Please provide a valid email address.' });
  }

  // Check if already subscribed
  const existingSubscriber = await prisma.newsletterSubscriber.findUnique({
    where: { email }
  });

  if (existingSubscriber) {
    if (existingSubscriber.status === 'unsubscribed') {
      await prisma.newsletterSubscriber.update({
        where: { email },
        data: { status: 'active', subscribedAt: new Date() }
      });
      return res.status(200).json({ status: 'success', message: 'Successfully re-subscribed to the newsletter!' });
    }
    return res.status(400).json({ status: 'fail', message: 'This email is already subscribed to our newsletter.' });
  }

  // Create new subscriber
  await prisma.newsletterSubscriber.create({
    data: { email }
  });

  res.status(201).json({
    status: 'success',
    message: 'Successfully subscribed to the newsletter!'
  });
}));

export default router;
