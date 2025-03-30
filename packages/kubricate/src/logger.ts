import { MARK_ERROR, MARK_INFO } from './constant.js';
import c from 'ansis';

export interface ILogger {
  log(message: string): void;
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
  success(message: string): void;
}

export class Logger implements ILogger {
  log(message: string): void {
    console.log(message);
  }

  info(message: string): void {
    console.info(`${MARK_INFO} ${message}`);
  }

  success(message: string): void {
    console.log(c.green`${MARK_INFO} ${message}`);
  }

  warn(message: string): void {
    console.warn(message);
  }

  error(message: string): void {
    console.error(c.red`${MARK_ERROR} ${message}`);
  }
}
