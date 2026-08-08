import { Router } from 'express';
import { 
  getProfile, 
  getAddresses, 
  createAddress, 
  getCart, 
  addToCart, 
  removeFromCart, 
  mergeCart,
  getWishlist, 
  addToWishlist, 
  removeFromWishlist,
  getNotifications,
  markNotificationRead,
  updateProfile,
  adminGetUsers,
  adminToggleBlockUser,
  adminDeleteUser,
  adminGetLoginHistory,
  adminGetOtpLogs,
  updateAddress,
  deleteAddress,
  setDefaultAddress
} from '../controllers/user.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

// Profile
router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, updateProfile);

// Admin Controls
router.get('/admin/users', authenticate, authorize('admin'), adminGetUsers);
router.put('/admin/users/:id/block', authenticate, authorize('admin'), adminToggleBlockUser);
router.delete('/admin/users/:id', authenticate, authorize('admin'), adminDeleteUser);
router.get('/admin/users/:id/login-history', authenticate, authorize('admin'), adminGetLoginHistory);
router.get('/admin/otp-logs', authenticate, authorize('admin'), adminGetOtpLogs);

// Addresses
router.get('/addresses', authenticate, getAddresses);
router.post('/addresses', authenticate, createAddress);
router.put('/addresses/:id', authenticate, updateAddress);
router.delete('/addresses/:id', authenticate, deleteAddress);
router.put('/addresses/:id/default', authenticate, setDefaultAddress);

// Cart
router.get('/cart', authenticate, getCart);
router.post('/cart', authenticate, addToCart);
router.delete('/cart/:productId', authenticate, removeFromCart);
router.post('/cart/merge', authenticate, mergeCart);

// Wishlist
router.get('/wishlist', authenticate, getWishlist);
router.post('/wishlist', authenticate, addToWishlist);
router.delete('/wishlist/:productId', authenticate, removeFromWishlist);

// Notifications
router.get('/notifications', authenticate, getNotifications);
router.put('/notifications/:id/read', authenticate, markNotificationRead);

export default router;
