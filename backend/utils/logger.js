/**
 * Structured logger for NETflash backend.
 * All logging should go through this utility — no raw console.log in production code.
 */
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

const currentLevel = process.env.NODE_ENV === 'production' ? LOG_LEVELS.WARN : LOG_LEVELS.DEBUG;

function formatMessage(level, context, message, data) {
  const timestamp = new Date().toISOString();
  const base = `[${timestamp}] [${level}] [${context}] ${message}`;
  return data ? `${base} ${JSON.stringify(data)}` : base;
}

const logger = {
  error(context, message, data) {
    if (currentLevel >= LOG_LEVELS.ERROR) {
      console.error(formatMessage('ERROR', context, message, data));
    }
  },
  warn(context, message, data) {
    if (currentLevel >= LOG_LEVELS.WARN) {
      console.warn(formatMessage('WARN', context, message, data));
    }
  },
  info(context, message, data) {
    if (currentLevel >= LOG_LEVELS.INFO) {
      console.info(formatMessage('INFO', context, message, data));
    }
  },
  debug(context, message, data) {
    if (currentLevel >= LOG_LEVELS.DEBUG) {
      console.debug(formatMessage('DEBUG', context, message, data));
    }
  }
};

module.exports = logger;
