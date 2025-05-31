import { describe, it, expect } from 'vitest';

import { resolveCors, type CorsPolicy, type CorsPreset } from './cors.js';

describe('resolveCors', () => {
  const commonMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];
  const commonHeaders = ['Authorization', 'Content-Type'];

  it('should return undefined if no preset is provided', () => {
    expect(resolveCors()).toBeUndefined();
  });

  it('should return public CORS policy for type "public"', () => {
    const result = resolveCors({ type: 'public' });
    expect(result).toEqual<CorsPolicy>({
      allowOrigin: ['*'],
      allowMethods: commonMethods,
      allowHeaders: commonHeaders,
      allowCredentials: false,
    });
  });

  it('should return strict CORS policy with single origin', () => {
    const result = resolveCors({ type: 'strict', origin: 'https://app.example.com' });
    expect(result).toEqual<CorsPolicy>({
      allowOrigin: ['https://app.example.com'],
      allowMethods: commonMethods,
      allowHeaders: commonHeaders,
      allowCredentials: true,
    });
  });

  it('should return strict CORS policy with multiple origins', () => {
    const origins = ['https://app.example.com', 'https://admin.example.com'];
    const result = resolveCors({ type: 'strict', origin: origins });
    expect(result).toEqual<CorsPolicy>({
      allowOrigin: origins,
      allowMethods: commonMethods,
      allowHeaders: commonHeaders,
      allowCredentials: true,
    });
  });

  it('should return custom CORS policy as-is', () => {
    const customConfig: CorsPolicy = {
      allowOrigin: ['https://custom.example.com'],
      allowMethods: ['POST'],
      allowHeaders: ['X-Custom-Header'],
      allowCredentials: true,
      exposeHeaders: ['X-Response-Time'],
      maxAge: '1h',
    };

    const result = resolveCors({ type: 'custom', config: customConfig });
    expect(result).toEqual(customConfig);
  });

  describe('resolveCors', () => {
    it('returns undefined for unrecognized preset type (default case)', () => {
      const unknownPreset = {
        type: 'invalid-type', // not public, strict, or custom
      } as unknown as CorsPreset;

      const result = resolveCors(unknownPreset);
      expect(result).toBeUndefined();
    });
  });
});
