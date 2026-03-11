import { config } from './config.js';
import { createServer } from './server.js';
import { logger } from './utils/logger.js';

const { server } = createServer();

server.listen(config.PORT, () => {
  logger.info({ port: config.PORT }, 'Realtime bridge listening');
});

function shutdown(signal: string) {
  logger.info({ signal }, 'Shutting down gracefully');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });

  setTimeout(() => {
    logger.warn('Forceful shutdown after timeout');
    process.exit(1);
  }, 10_000);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled rejection');
});

process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught exception');
  process.exit(1);
});
