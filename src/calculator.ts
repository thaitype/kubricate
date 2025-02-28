import { logger } from './internal/utils.js';

export function add(a: number, b: number) {
  logger(`Adding ${a} and ${b}`);
  return a + b;
}
