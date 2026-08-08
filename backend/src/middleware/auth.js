import jwt from 'jsonwebtoken';
import { UnauthorizedError, ForbiddenError } from '../utils/appError.js';
import prisma from '../config/db.js';

export const authenticate = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next(new UnauthorizedError("Access Denied: Missing Authorization Header Token"));
  }

  jwt.verify(token, process.env.JWT_SECRET || 'secret', async (err, decoded) => {
    if (err) {
      return next(new ForbiddenError("Forbidden: Session expired or signature verification failed"));
    }
    try {
      const user = await prisma.user.findUnique({ where: { id: decoded.id } });
      if (!user) {
        return next(new UnauthorizedError("Forbidden: User account no longer exists."));
      }
      if (user.status === 'banned') {
        return next(new ForbiddenError("Forbidden: Your account has been suspended by an administrator."));
      }
      req.user = user;
      next();
    } catch (dbErr) {
      next(dbErr);
    }
  });
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new ForbiddenError(`Forbidden: Role '${req.user?.role || 'anonymous'}' is unauthorized.`));
    }
    next();
  };
};
