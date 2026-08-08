import logger from '../utils/logger.js';

export default function errorHandler(err, req, res, next) {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Handle unique constraint Prisma errors
  if (err.code === 'P2002') {
    err.statusCode = 400;
    err.status = 'fail';
    const fields = err.meta?.target ? err.meta.target.join(', ') : 'field';
    err.message = `Unique constraint failed on ${fields}. A record already exists.`;
  }

  // Handle validation or type failures
  if (err.name === 'ValidationError') {
    err.statusCode = 400;
    err.status = 'fail';
  }

  // Log error stack trace
  logger.error(`${err.message} \n ${err.stack}`);

  res.status(err.statusCode).json({
    status: err.status,
    error: {
      message: err.message || 'Internal server issue occurred.',
      ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    }
  });
}
