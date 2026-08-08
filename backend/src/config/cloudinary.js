import { v2 as cloudinary } from 'cloudinary';
import logger from '../utils/logger.js';

// Setup Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'mock_cloud',
  api_key: process.env.CLOUDINARY_API_KEY || 'mock_key',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'mock_secret'
});

logger.info('Cloudinary interface configured (Sandbox placeholders active if keys missing)');

export default cloudinary;
