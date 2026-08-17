import cloudinary from '../config/cloudinary.js';
import fs from 'fs';
import path from 'path';
import logger from '../utils/logger.js';

/**
 * Upload an image to Cloudinary (production) or save locally (development only).
 *
 * In production, this ALWAYS uploads to Cloudinary and returns an absolute
 * https://res.cloudinary.com/... URL.
 *
 * In development without Cloudinary credentials, falls back to local filesystem
 * serving via express.static at /uploads/imported/.
 */
export const uploadImage = async (filePath, folder = 'rikkas_products') => {
  try {
    const cfg = cloudinary.config();
    const hasCloudinaryCredentials = cfg.cloud_name && cfg.api_key && cfg.api_secret;

    // ── Development-only local mock ─────────────────────────────────────────
    if (!hasCloudinaryCredentials) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error(
          'Cloudinary credentials are missing in production. ' +
          'Cannot upload images. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, ' +
          'and CLOUDINARY_API_SECRET environment variables.'
        );
      }

      logger.info(`[DEV] Local mock upload for: ${filePath}`);
      const filename = path.basename(filePath);
      return {
        secure_url: `/uploads/imported/${filename}`,
        public_id: `dev_mock_${Date.now()}`
      };
    }

    // ── Production: always upload to Cloudinary ─────────────────────────────
    const result = await cloudinary.uploader.upload(filePath, { folder });

    // Clean up local temp file after successful upload
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    return {
      secure_url: result.secure_url,
      public_id: result.public_id
    };
  } catch (error) {
    // Clean up local temp file on error to prevent orphans
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (cleanupError) {
        logger.error(`Error cleaning up temp file: ${cleanupError.message}`);
      }
    }
    logger.error(`Cloudinary Upload Error: ${error.message || error}`);
    throw error;
  }
};
