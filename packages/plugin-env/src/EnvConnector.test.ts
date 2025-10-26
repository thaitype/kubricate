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

  it('returns undefined for getWorkingDir() when not set', () => {
    const connector = new EnvConnector();
    expect(connector.getWorkingDir()).toBeUndefined();
  });

  it('returns the working directory when set', () => {
    const connector = new EnvConnector({ workingDir: '/test/dir' });
    expect(connector.getWorkingDir()).toBe('/test/dir');
  });

  it('parses valid flat object JSON from environment variable', async () => {
    // eslint-disable-next-line turbo/no-undeclared-env-vars
    process.env['KUBRICATE_SECRET_JSON_OBJ'] = '{"key1":"value1","key2":"value2","key3":123}';
    const connector = new EnvConnector();
    await connector.load(['JSON_OBJ']);
    expect(connector.get('JSON_OBJ')).toEqual({ key1: 'value1', key2: 'value2', key3: 123 });
  });

  it('parses flat object with boolean and null values', async () => {
    // eslint-disable-next-line turbo/no-undeclared-env-vars
    process.env['KUBRICATE_SECRET_COMPLEX'] = '{"enabled":true,"count":42,"name":"test","empty":null}';
    const connector = new EnvConnector();
    await connector.load(['COMPLEX']);
    expect(connector.get('COMPLEX')).toEqual({ enabled: true, count: 42, name: 'test', empty: null });
  });

  it('keeps array as string fallback', async () => {
    // eslint-disable-next-line turbo/no-undeclared-env-vars
    process.env['KUBRICATE_SECRET_ARRAY'] = '["item1","item2"]';
    const connector = new EnvConnector();
    await connector.load(['ARRAY']);
    expect(connector.get('ARRAY')).toBe('["item1","item2"]');
  });

  it('keeps nested object as string fallback', async () => {
    // eslint-disable-next-line turbo/no-undeclared-env-vars
    process.env['KUBRICATE_SECRET_NESTED'] = '{"outer":{"inner":"value"}}';
    const connector = new EnvConnector();
    await connector.load(['NESTED']);
    expect(connector.get('NESTED')).toBe('{"outer":{"inner":"value"}}');
  });
});
