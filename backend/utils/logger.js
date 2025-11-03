/**
 * Structured logging utility for ChainEquity backend
 */

const LOG_LEVELS = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG',
};

class Logger {
  constructor(context = 'APP') {
    this.context = context;
    this.level = process.env.LOG_LEVEL || 'INFO';
  }

  shouldLog(level) {
    const levels = Object.keys(LOG_LEVELS);
    const currentIndex = levels.indexOf(this.level);
    const messageIndex = levels.indexOf(level);
    return messageIndex <= currentIndex;
  }

  formatMessage(level, message, meta = {}) {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      context: this.context,
      message,
      ...meta,
    });
  }

  error(message, error = null, meta = {}) {
    if (!this.shouldLog(LOG_LEVELS.ERROR)) return;
    
    const errorData = error ? {
      error: {
        message: error.message,
        stack: error.stack,
        ...error,
      }
    } : {};
    
    console.error(this.formatMessage(LOG_LEVELS.ERROR, message, { ...meta, ...errorData }));
  }

  warn(message, meta = {}) {
    if (!this.shouldLog(LOG_LEVELS.WARN)) return;
    console.warn(this.formatMessage(LOG_LEVELS.WARN, message, meta));
  }

  info(message, meta = {}) {
    if (!this.shouldLog(LOG_LEVELS.INFO)) return;
    console.log(this.formatMessage(LOG_LEVELS.INFO, message, meta));
  }

  debug(message, meta = {}) {
    if (!this.shouldLog(LOG_LEVELS.DEBUG)) return;
    console.log(this.formatMessage(LOG_LEVELS.DEBUG, message, meta));
  }
}

// Create logger instances for different parts of the app
const createLogger = (context) => new Logger(context);

module.exports = {
  Logger,
  createLogger,
  logger: new Logger('APP'),
};

