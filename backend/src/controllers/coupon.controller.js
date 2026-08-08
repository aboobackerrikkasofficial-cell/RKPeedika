import prisma from '../config/db.js';
import { NotFoundError, BadRequestError } from '../utils/appError.js';

export const getAllCoupons = async (req, res, next) => {
  try {
    const coupons = await prisma.coupon.findMany();
    res.json(coupons);
  } catch (error) {
    next(error);
  }
};

export const createCoupon = async (req, res, next) => {
  const { code, type, value, minSpend, maxDiscount, expiresAt } = req.body;

  if (!code || !type || !value) {
    return next(new BadRequestError("Coupon code, type (percentage/flat), and value are required."));
  }

  try {
    const existing = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });
    if (existing) {
      return next(new BadRequestError("Coupon code already exists."));
    }

    const coupon = await prisma.coupon.create({
      data: {
        code: code.toUpperCase(),
        type,
        value: Number(value),
        minSpend: minSpend ? Number(minSpend) : 0,
        maxDiscount: maxDiscount ? Number(maxDiscount) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        status: "active"
      }
    });

    res.status(201).json({
      success: true,
      message: "Coupon created",
      coupon
    });
  } catch (error) {
    next(error);
  }
};

export const validateCoupon = async (req, res, next) => {
  const { code, spendAmount } = req.body;

  if (!code) {
    return next(new BadRequestError("Coupon code is required for validation."));
  }

  try {
    const coupon = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });
    
    if (!coupon || coupon.status !== 'active') {
      return next(new NotFoundError("Invalid or inactive coupon code."));
    }

    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      return next(new BadRequestError("Coupon code has expired."));
    }

    if (spendAmount && Number(spendAmount) < coupon.minSpend) {
      return next(new BadRequestError(`Minimum purchase of ₹${coupon.minSpend} required to use coupon.`));
    }

    res.json({
      success: true,
      message: "Coupon code is valid",
      coupon
    });
  } catch (error) {
    next(error);
  }
};

export const updateCoupon = async (req, res, next) => {
  const { id } = req.params;
  const { code, type, value, minSpend, maxDiscount, expiresAt, status } = req.body;

  try {
    const updateData = {};
    if (code) updateData.code = code.toUpperCase();
    if (type) updateData.type = type;
    if (value !== undefined) updateData.value = Number(value);
    if (minSpend !== undefined) updateData.minSpend = Number(minSpend);
    if (maxDiscount !== undefined) updateData.maxDiscount = maxDiscount ? Number(maxDiscount) : null;
    if (expiresAt !== undefined) updateData.expiresAt = expiresAt ? new Date(expiresAt) : null;
    if (status) updateData.status = status;

    const coupon = await prisma.coupon.update({
      where: { id },
      data: updateData
    });

    res.json({
      success: true,
      message: "Coupon updated successfully",
      coupon
    });
  } catch (error) {
    next(error);
  }
};

export const deleteCoupon = async (req, res, next) => {
  const { id } = req.params;

  try {
    await prisma.coupon.delete({ where: { id } });
    res.json({
      success: true,
      message: "Coupon deleted successfully"
    });
  } catch (error) {
    next(error);
  }
};
