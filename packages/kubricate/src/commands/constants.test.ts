import { describe, expect, it } from 'vitest';

import { FRAMEWORK_LABEL, LABELS } from './constants.js';

describe('constants', () => {
  describe('FRAMEWORK_LABEL', () => {
    it('should be defined with correct value', () => {
      expect(FRAMEWORK_LABEL).toBe('kubricate.thaitype.dev');
    });
  });

  describe('LABELS', () => {
    it('should have kubricate label', () => {
      expect(LABELS.kubricate).toBe('kubricate.thaitype.dev');
    });

    it('should have version label with framework prefix', () => {
      expect(LABELS.version).toBe('kubricate.thaitype.dev/version');
    });

    it('should have managedAt label with framework prefix', () => {
      expect(LABELS.managedAt).toBe('kubricate.thaitype.dev/managed-at');
    });

    it('should have stackId label with framework prefix', () => {
      expect(LABELS.stackId).toBe('kubricate.thaitype.dev/stack-id');
    });

    it('should have stackName label with framework prefix', () => {
      expect(LABELS.stackName).toBe('kubricate.thaitype.dev/stack-name');
    });

    it('should have resourceId label with framework prefix', () => {
      expect(LABELS.resourceId).toBe('kubricate.thaitype.dev/resource-id');
    });

    it('should have secretManagerId label with framework prefix', () => {
      expect(LABELS.secretManagerId).toBe('kubricate.thaitype.dev/secret-manager-id');
    });

    it('should have secretManagerName label with framework prefix', () => {
      expect(LABELS.secretManagerName).toBe('kubricate.thaitype.dev/secret-manager-name');
    });

    it('should have resourceHash label with framework prefix', () => {
      expect(LABELS.resourceHash).toBe('kubricate.thaitype.dev/resource-hash');
    });

    it('should have all expected label keys', () => {
      const expectedKeys = [
        'kubricate',
        'version',
        'managedAt',
        'stackId',
        'stackName',
        'resourceId',
        'secretManagerId',
        'secretManagerName',
        'resourceHash',
      ];

      expect(Object.keys(LABELS).sort()).toEqual(expectedKeys.sort());
    });
  });
});
