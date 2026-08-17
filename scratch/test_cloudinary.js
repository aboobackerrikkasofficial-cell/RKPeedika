import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.resolve('backend/.env') });

import { uploadImage } from '../backend/src/services/cloudinary.service.js';

async function testCloudinary() {
  console.log('CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME);
  console.log('CLOUDINARY_API_KEY:', process.env.CLOUDINARY_API_KEY);
  
  const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
  const filePath = path.resolve('scratch/test_valid.png');
  
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, Buffer.from(pngBase64, 'base64'));
  console.log('Created valid test PNG at:', filePath);

  try {
    console.log('Attempting upload to Cloudinary...');
    const result = await uploadImage(filePath, 'rikkas_products_test');
    console.log('Upload SUCCESS!');
    console.log('Result:', result);
  } catch (error) {
    console.error('Upload FAILED!');
    console.error(error);
  }
}

testCloudinary();
