import type { BaseLogger } from '@kubricate/core';

export function handlerError(error: unknown, logger: BaseLogger): void {
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
