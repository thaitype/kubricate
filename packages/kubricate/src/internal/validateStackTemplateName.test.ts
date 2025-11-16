import { describe, expect, it } from 'vitest';

import { validateStackTemplateName } from './utils.js';

describe('validateStackTemplateName', () => {
  describe('valid names', () => {
    it('should accept simple template name', () => {
      expect(() => validateStackTemplateName('simple-app')).not.toThrow();
    });

    it('should accept template name with numbers', () => {
      expect(() => validateStackTemplateName('app-v2')).not.toThrow();
    });

    it('should accept template name with dots', () => {
      expect(() => validateStackTemplateName('app.template')).not.toThrow();
    });

    it('should accept template name with underscores', () => {
      expect(() => validateStackTemplateName('app_template')).not.toThrow();
    });

    it('should accept template name with hyphens', () => {
      expect(() => validateStackTemplateName('app-template')).not.toThrow();
    });

    it('should accept org scoped name', () => {
      expect(() => validateStackTemplateName('@acme/simple-app')).not.toThrow();
    });

    it('should accept org and package scoped name', () => {
      expect(() => validateStackTemplateName('@acme/app-stacks/simple-app')).not.toThrow();
    });

    it('should accept complex org name', () => {
      expect(() => validateStackTemplateName('@platform-team/simple-app')).not.toThrow();
    });

    it('should accept complex package name', () => {
      expect(() => validateStackTemplateName('@acme/k8s-templates/simple-app')).not.toThrow();
    });

    it('should accept all allowed characters', () => {
      expect(() => validateStackTemplateName('@org.name/pkg_name/template-name.v2')).not.toThrow();
    });
  });

  describe('invalid names - pattern violations', () => {
    it('should reject name with spaces', () => {
      expect(() => validateStackTemplateName('simple app')).toThrow(
        /Invalid stack template name: "simple app"/
      );
    });

    it('should reject name with uppercase letters', () => {
      expect(() => validateStackTemplateName('SimpleApp')).toThrow(
        /Invalid stack template name: "SimpleApp"/
      );
    });

    it('should reject name with special characters', () => {
      expect(() => validateStackTemplateName('simple@app')).toThrow(
        /Invalid stack template name: "simple@app"/
      );
    });

    it('should reject name with exclamation mark', () => {
      expect(() => validateStackTemplateName('simple-app!')).toThrow(
        /Invalid stack template name: "simple-app!"/
      );
    });

    it('should reject name with hash', () => {
      expect(() => validateStackTemplateName('simple#app')).toThrow(
        /Invalid stack template name: "simple#app"/
      );
    });

    it('should reject org name with spaces', () => {
      expect(() => validateStackTemplateName('@my org/simple-app')).toThrow(
        /Invalid stack template name: "@my org\/simple-app"/
      );
    });

    it('should reject org name with uppercase', () => {
      expect(() => validateStackTemplateName('@Acme/simple-app')).toThrow(
        /Invalid stack template name: "@Acme\/simple-app"/
      );
    });

    it('should reject package name with spaces', () => {
      expect(() => validateStackTemplateName('@acme/my templates/simple-app')).toThrow(
        /Invalid stack template name: "@acme\/my templates\/simple-app"/
      );
    });

    it('should reject empty string', () => {
      expect(() => validateStackTemplateName('')).toThrow(/Invalid stack template name: ""/);
    });

    it('should reject name starting with slash', () => {
      expect(() => validateStackTemplateName('/simple-app')).toThrow(
        /Invalid stack template name: "\/simple-app"/
      );
    });

    it('should reject name ending with slash', () => {
      expect(() => validateStackTemplateName('simple-app/')).toThrow(
        /Invalid stack template name: "simple-app\/"/
      );
    });

    it('should reject name with multiple slashes', () => {
      expect(() => validateStackTemplateName('org/pkg/sub/name')).toThrow(
        /Invalid stack template name: "org\/pkg\/sub\/name"/
      );
    });

    it('should reject @ without org name', () => {
      expect(() => validateStackTemplateName('@/simple-app')).toThrow(
        /Invalid stack template name: "@\/simple-app"/
      );
    });
  });

  describe('invalid names - length violations', () => {
    it('should reject name longer than 253 characters', () => {
      const longName = 'a'.repeat(254);
      expect(() => validateStackTemplateName(longName)).toThrow(/Stack template name too long/);
    });

    it('should accept name with exactly 253 characters', () => {
      const maxName = 'a'.repeat(253);
      expect(() => validateStackTemplateName(maxName)).not.toThrow();
    });

    it('should reject scoped name longer than 253 characters', () => {
      const longName = '@org/' + 'a'.repeat(250);
      expect(() => validateStackTemplateName(longName)).toThrow(/Stack template name too long/);
    });
  });

  describe('error messages', () => {
    it('should provide helpful error message for invalid pattern', () => {
      try {
        validateStackTemplateName('Invalid Name');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect((error as Error).message).toContain('Stack template names must match one of these patterns');
        expect((error as Error).message).toContain('<templateName>');
        expect((error as Error).message).toContain('@<orgName>/<templateName>');
        expect((error as Error).message).toContain('@<orgName>/<packageName>/<templateName>');
        expect((error as Error).message).toContain('Allowed characters: a-z, 0-9, . _ -');
        expect((error as Error).message).toContain('Examples:');
      }
    });

    it('should provide helpful error message for length violation', () => {
      try {
        validateStackTemplateName('a'.repeat(300));
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect((error as Error).message).toContain('Stack template name too long');
        expect((error as Error).message).toContain('Maximum length is 253 characters');
        expect((error as Error).message).toContain('got 300');
      }
    });
  });

  describe('edge cases', () => {
    it('should accept single character name', () => {
      expect(() => validateStackTemplateName('a')).not.toThrow();
    });

    it('should accept name with only numbers', () => {
      expect(() => validateStackTemplateName('123')).not.toThrow();
    });

    it('should accept name with only dots', () => {
      expect(() => validateStackTemplateName('...')).not.toThrow();
    });

    it('should accept org name with dots', () => {
      expect(() => validateStackTemplateName('@org.name/template')).not.toThrow();
    });

    it('should accept package name with underscores', () => {
      expect(() => validateStackTemplateName('@org/pkg_name/template')).not.toThrow();
    });
  });
});
