import { describe, it, expect, beforeEach } from 'vitest';
import { EnvLoader } from './EnvLoader.js';
import path from 'node:path';
import { writeFileSync, unlinkSync } from 'node:fs';

describe('EnvLoader', () => {
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
    const loader = new EnvLoader();
    await loader.load(['MY_SECRET']);
    expect(loader.get('MY_SECRET')).toBe('value');
  });

  it('throws on missing env var', async () => {
    const loader = new EnvLoader();
    await expect(loader.load(['MISSING_SECRET'])).rejects.toThrow('Missing environment variable');
  });

  it('validates secret name format', async () => {
    const loader = new EnvLoader();
    await expect(loader.load(['invalid-secret'])).rejects.toThrow('Invalid env var name');
  });

  it('supports case-insensitive loading', async () => {
    // eslint-disable-next-line turbo/no-undeclared-env-vars
    process.env['KUBRICATE_SECRET_MY_SECRET'] = 'value';
    const loader = new EnvLoader({ caseInsensitive: true });
    await loader.load(['my_secret']);
    expect(loader.get('my_secret')).toBe('value');
  });

  it('throws if case-insensitive match not found', async () => {
    // eslint-disable-next-line turbo/no-undeclared-env-vars
    process.env['KUBRICATE_SECRET_ACTUAL'] = 'value';
    const loader = new EnvLoader({ caseInsensitive: true });
    await expect(loader.load(['notfound'])).rejects.toThrow('Missing environment variable');
  });

  it('loads from .env file if enabled', async () => {
    writeFileSync(envPath, 'KUBRICATE_SECRET_DOTENV=fromenv\n');
    const loader = new EnvLoader({ allowDotEnv: true });
    await loader.load(['DOTENV']);
    expect(loader.get('DOTENV')).toBe('fromenv');
  });

  it('skips loading .env file if disabled', async () => {
    writeFileSync(envPath, 'KUBRICATE_SECRET_SHOULD_NOT_LOAD=fail\n');
    const loader = new EnvLoader({ allowDotEnv: false });
    await expect(loader.load(['SHOULD_NOT_LOAD'])).rejects.toThrow('Missing environment variable');
  });

  it('get throws if secret not loaded', () => {
    const loader = new EnvLoader();
    expect(() => loader.get('NOT_LOADED')).toThrow("Secret 'NOT_LOADED' not loaded");
  });

  it('returns the correct .env path', () => {
    const loader = new EnvLoader();
    expect(loader.getEnvFilePath()).toBe(path.join(process.cwd(), '.env'));
  });

  it('respects custom working directory', () => {
    const loader = new EnvLoader();
    loader.setWorkingDir('/custom/dir');
    expect(loader.getEnvFilePath()).toBe(path.join('/custom/dir', '.env'));
  });
});
