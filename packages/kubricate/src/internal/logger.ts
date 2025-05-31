import c from 'ansis';
import { MARK_ERROR, MARK_INFO, MARK_WARNING } from './constant.js';
import type { BaseLogger, LogLevel } from '@kubricate/core';

export class ConsoleLogger implements BaseLogger {
  constructor(public level: LogLevel = 'debug') {}

  private shouldLog(target: LogLevel) {
    if (this.level === 'silent') return false; // silent disables all except manual error()
    const levels: LogLevel[] = ['error', 'warn', 'info', 'debug'];
    return levels.indexOf(target) <= levels.indexOf(this.level);
  }

  log(message: string) {
    if (this.shouldLog('info')) console.log(message);
  }

  info(message: string) {
    if (this.shouldLog('info')) console.info(`${MARK_INFO} ${message}`);
  }

  warn(message: string) {
    if (this.shouldLog('warn')) console.warn(c.yellow(`${MARK_WARNING} ${message}`));
  }

  error(message: string) {
    console.error(c.red(`${MARK_ERROR} ${message}`));
  }

  debug(message: string) {
    if (this.shouldLog('debug')) console.debug(c.dim(`[debug] ${message}`));
  }
}

export class SilentLogger implements BaseLogger {
  level: LogLevel = 'silent';
  log() {}
  info() {}
  warn() {}
  error() {}
  debug() {}
}
