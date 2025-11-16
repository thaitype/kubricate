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
        'resourceId',
        'secretManagerId',
        'secretManagerName',
        'resourceHash',
        // New stack template metadata fields
        'stackTemplateName',
        'stackTemplateVersion',
        'stackTemplateAuthor',
        'stackTemplateDescription',
        'stackTemplateHomepage',
        'stackTemplateRepository',
        'stackTemplateCoreVersion',
        // Deprecated (kept for backward compatibility)
        'stackName',
      ];

      expect(Object.keys(LABELS).sort()).toEqual(expectedKeys.sort());
    });

    // New tests for stack template metadata labels
    it('should have stackTemplateName label with framework prefix', () => {
      expect(LABELS.stackTemplateName).toBe('kubricate.thaitype.dev/stack-template-name');
    });

    it('should have stackTemplateVersion label with framework prefix', () => {
      expect(LABELS.stackTemplateVersion).toBe('kubricate.thaitype.dev/stack-template-version');
    });

    it('should have stackTemplateAuthor label with framework prefix', () => {
      expect(LABELS.stackTemplateAuthor).toBe('kubricate.thaitype.dev/stack-template-author');
    });

    it('should have stackTemplateDescription label with framework prefix', () => {
      expect(LABELS.stackTemplateDescription).toBe('kubricate.thaitype.dev/stack-template-description');
    });

    it('should have stackTemplateHomepage label with framework prefix', () => {
      expect(LABELS.stackTemplateHomepage).toBe('kubricate.thaitype.dev/stack-template-homepage');
    });

    it('should have stackTemplateRepository label with framework prefix', () => {
      expect(LABELS.stackTemplateRepository).toBe('kubricate.thaitype.dev/stack-template-repository');
    });

    it('should have stackTemplateCoreVersion label with framework prefix', () => {
      expect(LABELS.stackTemplateCoreVersion).toBe('kubricate.thaitype.dev/stack-template-core-version');
    });
  });
});
