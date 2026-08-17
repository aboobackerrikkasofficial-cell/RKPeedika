import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend folder root
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
// Also load from current working directory just in case
dotenv.config();

console.log('[ENV] Environment variables loaded successfully.');
