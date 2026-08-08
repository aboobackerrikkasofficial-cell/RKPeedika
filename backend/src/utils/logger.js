const levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

const colors = {
  error: '\x1b[31m', // Red
  warn: '\x1b[33m',  // Yellow
  info: '\x1b[32m',  // Green
  debug: '\x1b[36m', // Cyan
  reset: '\x1b[0m'
};

const formatMessage = (level, message) => {
  const timestamp = new Date().toISOString();
  return `${colors[level]}[${timestamp}] [${level.toUpperCase()}]: ${message}${colors.reset}`;
};

const logger = {
  error: (msg) => console.error(formatMessage('error', msg)),
  warn: (msg) => console.warn(formatMessage('warn', msg)),
  info: (msg) => console.log(formatMessage('info', msg)),
  debug: (msg) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(formatMessage('debug', msg));
    }
  }
};

export default logger;
