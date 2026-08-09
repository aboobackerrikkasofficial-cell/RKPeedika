import jwt from 'jsonwebtoken';
import prisma from '../config/db.js';
import {
  UnauthorizedError,
  ForbiddenError
} from '../utils/appError.js';

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // Authorization header must exist
    if (!authHeader) {
      return next(
        new UnauthorizedError(
          'Access Denied: Authorization token is required.'
        )
      );
    }

    // Expected:
    // Authorization: Bearer <token>
    if (!authHeader.startsWith('Bearer ')) {
      return next(
        new UnauthorizedError(
          'Access Denied: Invalid Authorization header format.'
        )
      );
    }

    const token = authHeader.substring(7).trim();

    if (!token) {
      return next(
        new UnauthorizedError(
          'Access Denied: Empty Authorization token.'
        )
      );
    }

    // Verify JWT
    let decoded;

    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return next(
          new UnauthorizedError(
            'Session expired. Please sign in again.'
          )
        );
      }

      return next(
        new UnauthorizedError(
          'Invalid authentication token.'
        )
      );
    }

    // Make sure JWT contains user ID
    if (!decoded || !decoded.id) {
      return next(
        new UnauthorizedError(
          'Invalid authentication token: user ID missing.'
        )
      );
    }

    // Find current user
    const user = await prisma.user.findUnique({
      where: {
        id: decoded.id
      }
    });

    if (!user) {
      return next(
        new UnauthorizedError(
          'User account no longer exists.'
        )
      );
    }

    // Check account status
    if (user.status === 'banned') {
      return next(
        new ForbiddenError(
          'Your account has been suspended by an administrator.'
        )
      );
    }

    // Attach user to request
    req.user = user;

    next();
  } catch (error) {
    next(error);
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(
        new UnauthorizedError(
          'Authentication required.'
        )
      );
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new ForbiddenError(
          `Role '${req.user.role}' is not authorized to perform this action.`
        )
      );
    }

    next();
  };
};