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

export default function getImageUrl(image) {
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
    return value;
  }

  // Relative path — prepend backend domain
  const cleanPath = value.startsWith('/') ? value : `/${value}`;
  return `${BACKEND_URL}${cleanPath}`;
}
