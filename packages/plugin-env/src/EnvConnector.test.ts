import { unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { beforeEach, describe, expect, it } from 'vitest';

import { EnvConnector } from './EnvConnector.js';

describe('EnvConnector', () => {
  const envPath = path.join(process.cwd(), '.env');

  beforeEach(() => {
    process.env = {};
    try {
      unlinkSync(envPath);
      // eslint-disable-next-line no-empty
    } catch {}
  });

  it('loads secrets from process.env', async () => {
    // eslint-disable-next-line turbo/no-undeclared-env-vars
    process.env['KUBRICATE_SECRET_MY_SECRET'] = 'value';
    const connector = new EnvConnector();
    await connector.load(['MY_SECRET']);
    expect(connector.get('MY_SECRET')).toBe('value');
  });

  it('throws on missing env var', async () => {
    const connector = new EnvConnector();
    await expect(connector.load(['MISSING_SECRET'])).rejects.toThrow('Missing environment variable');
  });

  it('validates secret name format', async () => {
    const connector = new EnvConnector();
    await expect(connector.load(['invalid-secret'])).rejects.toThrow(
      'Missing environment variable: KUBRICATE_SECRET_invalid-secret'
    );
  });

  it('supports case-insensitive loading', async () => {
    // eslint-disable-next-line turbo/no-undeclared-env-vars
    process.env['KUBRICATE_SECRET_MY_SECRET'] = 'value';
    const connector = new EnvConnector({ caseInsensitive: true });
    await connector.load(['my_secret']);
    expect(connector.get('my_secret')).toBe('value');
  });

  it('throws if case-insensitive match not found', async () => {
    // eslint-disable-next-line turbo/no-undeclared-env-vars
    process.env['KUBRICATE_SECRET_ACTUAL'] = 'value';
    const connector = new EnvConnector({ caseInsensitive: true });
    await expect(connector.load(['notfound'])).rejects.toThrow('Missing environment variable');
  });

  it('loads from .env file if enabled', async () => {
    writeFileSync(envPath, 'KUBRICATE_SECRET_DOTENV=fromenv\n');
    const connector = new EnvConnector({ allowDotEnv: true });
    await connector.load(['DOTENV']);
    expect(connector.get('DOTENV')).toBe('fromenv');
  });

  it('skips loading .env file if disabled', async () => {
    writeFileSync(envPath, 'KUBRICATE_SECRET_SHOULD_NOT_LOAD=fail\n');
    const connector = new EnvConnector({ allowDotEnv: false });
    await expect(connector.load(['SHOULD_NOT_LOAD'])).rejects.toThrow('Missing environment variable');
  });

  it('get throws if secret not loaded', () => {
    const connector = new EnvConnector();
    expect(() => connector.get('NOT_LOADED')).toThrow("Secret 'NOT_LOADED' not loaded");
  });

  it('returns the correct .env path', () => {
    const connector = new EnvConnector();
    expect(connector.getEnvFilePath()).toBe(path.join(process.cwd(), '.env'));
  });

  it('respects custom working directory', () => {
    const connector = new EnvConnector();
    connector.setWorkingDir('/custom/dir');
    expect(connector.getEnvFilePath()).toBe(path.join('/custom/dir', '.env'));
  });
});
