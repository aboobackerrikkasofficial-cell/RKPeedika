/**
 * Middleware to set Cache-Control headers on semi-static GET endpoints.
 * Reduces database hits for data that changes infrequently.
 */
export const cachePublic = (maxAge = 300) => (req, res, next) => {
  if (req.method === 'GET') {
    res.setHeader('Cache-Control', `public, max-age=${maxAge}, stale-while-revalidate=${maxAge * 2}`);
  }
  next();
};
