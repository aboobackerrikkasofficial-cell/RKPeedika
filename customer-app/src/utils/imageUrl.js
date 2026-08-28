/**
 * Centralized image URL resolver for the customer app.
 *
 * If the URL is already absolute (http/https/data:), return as-is.
 * If it's a relative path (e.g. /uploads/...), prepend the backend domain.
 *
 * Import this ONE function everywhere instead of duplicating the logic.
 */

const API_URL = import.meta.env.VITE_API_URL || 'https://rkpeedika.onrender.com/api';
const BACKEND_URL = API_URL.replace(/\/api\/?$/, '');

export default function getImageUrl(image, width = 'auto') {
  if (!image) return '';

  // Handle objects with url/path properties
  if (typeof image === 'object' && image !== null) {
    image = image.url || image.path || '';
  }

  const value = String(image).trim();
  if (!value) return '';

  // Already an absolute URL — use directly
  if (
    value.startsWith('http://') ||
    value.startsWith('https://') ||
    value.startsWith('data:')
  ) {
    // If it's a Cloudinary URL, apply performance transformations
    if (value.includes('res.cloudinary.com') && !value.includes('/upload/w_') && !value.includes('/upload/f_auto')) {
      return value.replace('/upload/', `/upload/f_auto,q_auto,w_${width},c_limit/`);
    }
    return value;
  }

  // Relative path — prepend backend domain
  const cleanPath = value.startsWith('/') ? value : `/${value}`;
  return `${BACKEND_URL}${cleanPath}`;
}
