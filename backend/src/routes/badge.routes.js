import express from 'express';
import { PrismaClient } from '@prisma/client';
import { catchAsync } from '../utils/appError.js';

const router = express.Router();
const prisma = new PrismaClient();

// Public endpoint to get all visible badges
router.get('/', catchAsync(async (req, res) => {
  const badges = await prisma.trustBadge.findMany({
    where: { isVisible: true },
    orderBy: { order: 'asc' }
  });

  res.status(200).json({
    status: 'success',
    data: badges
  });
}));

export default router;
