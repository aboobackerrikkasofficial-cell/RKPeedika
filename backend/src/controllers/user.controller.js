import prisma from '../config/db.js';
import { NotFoundError, BadRequestError, ForbiddenError } from '../utils/appError.js';

export const getProfile = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, name: true, phone: true, role: true }
    });
    res.json(user);
  } catch (error) {
    next(error);
  }
};

// ADDRESSES
export const getAddresses = async (req, res, next) => {
  try {
    const addresses = await prisma.address.findMany({ where: { userId: req.user.id } });
    res.json(addresses);
  } catch (error) {
    next(error);
  }
};

export const createAddress = async (req, res, next) => {
  const {
    fullName, phone, alternatePhone, houseFlatNumber, streetRoadName,
    areaLocality, landmark, directions, city, district, state,
    pincode, addressType, isDefault
  } = req.body;

  if (!fullName || !phone || !houseFlatNumber || !streetRoadName || !areaLocality || !city || !district || !state || !pincode) {
    return next(new BadRequestError("Complete address fields are required."));
  }

  // Validate Indian phone number (10 digits)
  if (!/^\d{10}$/.test(phone)) {
    return next(new BadRequestError("Invalid phone number. Must be 10 digits."));
  }

  // Validate Indian pincode (6 digits)
  if (!/^\d{6}$/.test(pincode)) {
    return next(new BadRequestError("Invalid pincode. Must be 6 digits."));
  }

  try {
    const existingAddressesCount = await prisma.address.count({ where: { userId: req.user.id } });
    const willBeDefault = isDefault || existingAddressesCount === 0;

    if (willBeDefault) {
      await prisma.address.updateMany({
        where: { userId: req.user.id },
        data: { isDefault: false }
      });
    }

    const address = await prisma.address.create({
      data: {
        userId: req.user.id,
        fullName,
        phone,
        alternatePhone,
        houseFlatNumber,
        streetRoadName,
        areaLocality,
        landmark,
        directions,
        city,
        district,
        state,
        pincode,
        addressType: addressType || "home",
        isDefault: willBeDefault
      }
    });

    res.status(201).json(address);
  } catch (error) {
    next(error);
  }
};

export const updateAddress = async (req, res, next) => {
  const { id } = req.params;
  const {
    fullName, phone, alternatePhone, houseFlatNumber, streetRoadName,
    areaLocality, landmark, directions, city, district, state,
    pincode, addressType, isDefault
  } = req.body;

  if (!fullName || !phone || !houseFlatNumber || !streetRoadName || !areaLocality || !city || !district || !state || !pincode) {
    return next(new BadRequestError("Complete address fields are required."));
  }

  if (!/^\d{10}$/.test(phone)) {
    return next(new BadRequestError("Invalid phone number. Must be 10 digits."));
  }

  if (!/^\d{6}$/.test(pincode)) {
    return next(new BadRequestError("Invalid pincode. Must be 6 digits."));
  }

  try {
    const address = await prisma.address.findUnique({ where: { id } });
    if (!address || address.userId !== req.user.id) {
      return next(new NotFoundError("Address not found"));
    }

    if (isDefault) {
      await prisma.address.updateMany({
        where: { userId: req.user.id },
        data: { isDefault: false }
      });
    }

    const updatedAddress = await prisma.address.update({
      where: { id },
      data: {
        fullName, phone, alternatePhone, houseFlatNumber, streetRoadName,
        areaLocality, landmark, directions, city, district, state,
        pincode, addressType, isDefault
      }
    });

    res.json(updatedAddress);
  } catch (error) {
    next(error);
  }
};

export const deleteAddress = async (req, res, next) => {
  const { id } = req.params;

  try {
    const address = await prisma.address.findUnique({ where: { id } });
    if (!address || address.userId !== req.user.id) {
      return next(new NotFoundError("Address not found"));
    }

    await prisma.address.delete({ where: { id } });

    if (address.isDefault) {
      const remainingAddress = await prisma.address.findFirst({
        where: { userId: req.user.id }
      });
      if (remainingAddress) {
        await prisma.address.update({
          where: { id: remainingAddress.id },
          data: { isDefault: true }
        });
      }
    }

    res.json({ success: true, message: "Address deleted successfully" });
  } catch (error) {
    next(error);
  }
};

export const setDefaultAddress = async (req, res, next) => {
  const { id } = req.params;

  try {
    const address = await prisma.address.findUnique({ where: { id } });
    if (!address || address.userId !== req.user.id) {
      return next(new NotFoundError("Address not found"));
    }

    await prisma.address.updateMany({
      where: { userId: req.user.id },
      data: { isDefault: false }
    });

    const updatedAddress = await prisma.address.update({
      where: { id },
      data: { isDefault: true }
    });

    res.json(updatedAddress);
  } catch (error) {
    next(error);
  }
};

// CART
export const getCart = async (req, res, next) => {
  try {
    const cart = await prisma.cartItem.findMany({
      where: { userId: req.user.id },
      include: { product: true }
    });
    res.json(cart);
  } catch (error) {
    next(error);
  }
};

export const addToCart = async (req, res, next) => {
    const { productId, quantity, size, color, isOverwrite } = req.body;
    const itemSize = size || "";
    const itemColor = color || "";

    if (!productId) {
      return next(new BadRequestError("ProductId is required to append cart."));
    }

    try {
      const product = await prisma.product.findUnique({ where: { id: productId } });
      if (!product) return next(new NotFoundError("Product not found"));

      const cartItem = await prisma.cartItem.upsert({
        where: {
          userId_productId_size_color: {
            userId: req.user.id,
            productId,
            size: itemSize,
            color: itemColor
          }
        },
        update: {
          quantity: isOverwrite ? Number(quantity) : { increment: Number(quantity) || 1 }
        },
        create: {
          userId: req.user.id,
          productId,
          quantity: Number(quantity) || 1,
          size: itemSize,
          color: itemColor
        }
      });

      res.json(cartItem);
    } catch (error) {
      next(error);
  }
};

export const removeFromCart = async (req, res, next) => {
  const { productId } = req.params;
  const size = req.query.size || "";
  const color = req.query.color || "";

  try {
    await prisma.cartItem.delete({
      where: {
        userId_productId_size_color: {
          userId: req.user.id,
          productId,
          size,
          color
        }
      }
    });
    res.json({ success: true, message: "Item removed from cart" });
  } catch (error) {
    next(error);
  }
};

export const mergeCart = async (req, res, next) => {
  const { cart } = req.body;

  if (!cart || !Array.isArray(cart)) {
    return next(new BadRequestError("Cart items array is required to merge."));
  }

  try {
    // Batch product lookup instead of N+1 individual queries
    const productIds = cart.map(item => item.id).filter(Boolean);
    const existingProducts = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true }
    });
    const validProductIds = new Set(existingProducts.map(p => p.id));

    // Upsert only valid products
    const upsertPromises = cart
      .filter(item => validProductIds.has(item.id))
      .map(item => {
        const productId = item.id;
        const quantity = item.quantity || 1;
        const size = item.size || "";
        const color = item.color || "";

        return prisma.cartItem.upsert({
          where: {
            userId_productId_size_color: {
              userId: req.user.id,
              productId,
              size,
              color
            }
          },
          update: {
            quantity: { increment: quantity }
          },
          create: {
            userId: req.user.id,
            productId,
            quantity,
            size,
            color
          }
        });
      });

    await Promise.all(upsertPromises);

    const updatedCart = await prisma.cartItem.findMany({
      where: { userId: req.user.id },
      include: { product: true }
    });

    res.json({ success: true, cart: updatedCart });
  } catch (error) {
    next(error);
  }
};

// WISHLIST
export const getWishlist = async (req, res, next) => {
  try {
    const wishlist = await prisma.wishlistItem.findMany({
      where: { userId: req.user.id },
      include: { product: true }
    });
    res.json(wishlist);
  } catch (error) {
    next(error);
  }
};

export const addToWishlist = async (req, res, next) => {
  const { productId } = req.body;

  if (!productId) {
    return next(new BadRequestError("ProductId is required to append wishlist."));
  }

  try {
    const item = await prisma.wishlistItem.create({
      data: {
        userId: req.user.id,
        productId
      }
    });
    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
};

export const removeFromWishlist = async (req, res, next) => {
  const { productId } = req.params;

  try {
    await prisma.wishlistItem.delete({
      where: {
        userId_productId: {
          userId: req.user.id,
          productId
        }
      }
    });
    res.json({ success: true, message: "Item removed from wishlist" });
  } catch (error) {
    next(error);
  }
};

// NOTIFICATIONS
export const getNotifications = async (req, res, next) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' }
    });
    res.json(notifications);
  } catch (error) {
    next(error);
  }
};

export const markNotificationRead = async (req, res, next) => {
  const { id } = req.params;

  try {
    const notif = await prisma.notification.update({
      where: { id },
      data: { unread: false }
    });
    res.json(notif);
  } catch (error) {
    next(error);
  }
};

export const registerFcmToken = async (req, res, next) => {
  const { token } = req.body;
  if (!token) {
    return next(new BadRequestError("Token is required."));
  }

  try {
    // Upsert token to ensure no duplicates, but allow a user to have multiple different tokens
    const fcmToken = await prisma.fcmToken.upsert({
      where: { token },
      update: { userId: req.user.id },
      create: {
        token,
        userId: req.user.id
      }
    });

    res.status(201).json({ success: true, message: "Token registered", token: fcmToken });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req, res, next) => {
  const { name, email, phone } = req.body;

  try {
    const updateData = {};
    if (name !== undefined) {
      if (!name.trim()) {
        return next(new BadRequestError("Name cannot be empty."));
      }
      updateData.name = name.trim();
    }

    if (email !== undefined) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email.trim() || !emailRegex.test(email)) {
        return next(new BadRequestError("Please provide a valid email address."));
      }

      // Check if email is already taken by another user
      const existingUser = await prisma.user.findFirst({
        where: {
          email: email.trim().toLowerCase(),
          id: { not: req.user.id }
        }
      });
      if (existingUser) {
        return next(new BadRequestError("Email address is already in use by another account."));
      }

      updateData.email = email.trim().toLowerCase();
    }

    if (phone !== undefined) {
      let cleanedPhone = phone.trim().replace(/[^0-9]/g, '');
      if (cleanedPhone.length > 10 && cleanedPhone.startsWith('91')) {
        cleanedPhone = cleanedPhone.substring(2);
      }
      if (cleanedPhone.length !== 10) {
        return next(new BadRequestError("Please enter a valid 10-digit mobile number."));
      }

      // Check if phone is already taken by another user
      const existingUser = await prisma.user.findFirst({
        where: {
          phone: cleanedPhone,
          id: { not: req.user.id }
        }
      });
      if (existingUser) {
        return next(new BadRequestError("Mobile number is already in use by another account."));
      }

      updateData.phone = cleanedPhone;
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
      select: { id: true, email: true, name: true, phone: true, role: true }
    });

    res.json({
      success: true,
      message: "Profile details updated successfully",
      user
    });
  } catch (error) {
    next(error);
  }
};

export const adminGetUsers = async (req, res, next) => {
  const { search } = req.query;
  try {
    const whereClause = {};
    if (search) {
      whereClause.phone = {
        contains: search
      };
    }
    const users = await prisma.user.findMany({
      where: whereClause,
      select: { 
        id: true, 
        email: true, 
        name: true, 
        phone: true, 
        role: true, 
        status: true, 
        gender: true, 
        dob: true, 
        profileImage: true, 
        createdAt: true 
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ status: 'success', data: users });
  } catch (error) {
    next(error);
  }
};

export const adminToggleBlockUser = async (req, res, next) => {
  const { id } = req.params;
  const { status } = req.body; // active or banned

  if (!status || !['active', 'banned'].includes(status)) {
    return next(new BadRequestError("Status must be 'active' or 'banned'"));
  }

  try {
    const user = await prisma.user.update({
      where: { id },
      data: { status },
      select: { id: true, email: true, name: true, phone: true, role: true, status: true }
    });

    res.json({
      success: true,
      message: `User status changed to ${status}`,
      user
    });
  } catch (error) {
    next(error);
  }
};

export const adminDeleteUser = async (req, res, next) => {
  const { id } = req.params;

  try {
    await prisma.user.delete({ where: { id } });
    res.json({
      success: true,
      message: "User deleted successfully"
    });
  } catch (error) {
    next(error);
  }
};

export const adminGetLoginHistory = async (req, res, next) => {
  const { id } = req.params;
  try {
    const history = await prisma.loginHistory.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ status: 'success', data: history });
  } catch (error) {
    next(error);
  }
};

export const adminGetOtpLogs = async (req, res, next) => {
  if (process.env.NODE_ENV !== 'development') {
    return next(new ForbiddenError("OTP logs can only be viewed in development mode."));
  }
  try {
    const logs = await prisma.otpCode.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100
    });
    res.json({ status: 'success', data: logs });
  } catch (error) {
    next(error);
  }
};
