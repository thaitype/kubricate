export type LogLevel = 'silent' | 'error' | 'warn' | 'info' | 'debug';

export interface BaseLogger {
  level: LogLevel;
  log(message: string): void;
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
  debug(message: string): void;
}
