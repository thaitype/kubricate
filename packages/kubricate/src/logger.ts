import c from 'ansis';
import { MARK_ERROR, MARK_INFO } from './constant.js';
import type { BaseLogger } from '@kubricate/core';

export type LogLevel = 'silent' | 'error' | 'warn' | 'info' | 'debug';

export class SilentLogger implements BaseLogger {
  log() {}
  info() {}
  warn() {}
  error() {}
  debug() {}
}

export class ConsoleLogger implements BaseLogger {
  constructor(private level: LogLevel = 'debug') {}

  private shouldLog(target: LogLevel) {
    const levels: LogLevel[] = ['silent', 'error', 'warn', 'info', 'debug'];
    return levels.indexOf(target) <= levels.indexOf(this.level);
  }

  log(message: string) {
    if (this.shouldLog('info')) console.log(message);
  }

  info(message: string) {
    if (this.shouldLog('info')) console.info(`${MARK_INFO} ${message}`);
  }

  warn(message: string) {
    if (this.shouldLog('warn')) console.warn(c.yellow(`${MARK_INFO} ${message}`));
  }

  error(message: string) {
    if (this.shouldLog('error')) console.error(c.red(`${MARK_ERROR} ${message}`));
  }

  debug(message: string) {
    if (this.shouldLog('debug')) console.debug(c.dim(`[debug] ${message}`));
  }
}
