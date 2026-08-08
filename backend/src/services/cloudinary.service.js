import cloudinary from '../config/cloudinary.js';
import fs from 'fs';
import logger from '../utils/logger.js';

export const uploadImage = async (filePath, folder = 'kriti_marketplace') => {
  try {
    if (cloudinary.config().api_key === 'mock_key') {
      logger.info(`Simulated image upload for local file: ${filePath}`);
      return {
        secure_url: `/uploads/${filePath.split('/').pop()}`,
        public_id: `mock_${Date.now()}`
      };
    }

    const result = await cloudinary.uploader.upload(filePath, { folder });
    
    // Clean up local temp files after upload
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    return {
      secure_url: result.secure_url,
      public_id: result.public_id
    };
  } catch (error) {
    logger.error(`Cloudinary Upload Error: ${error.message}`);
    throw error;
  }
};
