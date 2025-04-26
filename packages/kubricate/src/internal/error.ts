import type { BaseLogger } from '@kubricate/core';
import { ConsoleLogger } from './logger.js';

export function handlerError(error: unknown, logger?: BaseLogger | undefined): void {
  if (logger === undefined) {
    logger = new ConsoleLogger('error');
  }
  if (error instanceof Error) {
    logger.error(`Error: ${error.message}`);
    if (logger.level === 'debug') {
      logger.error('Error stack trace:');
      logger.error(error.stack ?? 'Unknown error stack');
    }
  } else {
    logger.error(`Error: ${error}`);
  }
  process.exit(3);
}
