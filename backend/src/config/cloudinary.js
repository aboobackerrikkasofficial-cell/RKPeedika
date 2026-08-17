import { v2 as cloudinary } from 'cloudinary';
import logger from '../utils/logger.js';

// Setup Cloudinary configuration
const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (cloudName && apiKey && apiSecret) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret
  });
  logger.info('Cloudinary configured successfully.');
} else {
  if (process.env.NODE_ENV === 'production') {
    logger.error(
      'FATAL: Cloudinary credentials missing in production! ' +
      'Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.'
    );
  } else {
    logger.warn(
      'Cloudinary credentials not set — local development mock mode active. ' +
      'Uploads will be saved to local filesystem only.'
    );
  }
}

export default cloudinary;
