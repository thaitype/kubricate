export const FRAMEWORK_LABEL = 'kubricate.thaitype.dev';

export const LABELS = {
  kubricate: FRAMEWORK_LABEL,
  version: FRAMEWORK_LABEL + '/version',
  managedAt: FRAMEWORK_LABEL + '/managed-at',
  stackId: FRAMEWORK_LABEL + '/stack-id',
  resourceId: FRAMEWORK_LABEL + '/resource-id',
  secretManagerId: FRAMEWORK_LABEL + '/secret-manager-id',
  secretManagerName: FRAMEWORK_LABEL + '/secret-manager-name',
  resourceHash: FRAMEWORK_LABEL + '/resource-hash',

  // Stack template metadata
  stackTemplateName: FRAMEWORK_LABEL + '/stack-template-name',
  stackTemplateVersion: FRAMEWORK_LABEL + '/stack-template-version',
  stackTemplateAuthor: FRAMEWORK_LABEL + '/stack-template-author',
  stackTemplateDescription: FRAMEWORK_LABEL + '/stack-template-description',
  stackTemplateHomepage: FRAMEWORK_LABEL + '/stack-template-homepage',
  stackTemplateRepository: FRAMEWORK_LABEL + '/stack-template-repository',
  stackTemplateCoreVersion: FRAMEWORK_LABEL + '/stack-template-core-version',

  /**
   * @deprecated use stackTemplateName instead
   *
   * Will be removed in v1.0 (kept for backward compatibility)
   */
  stackName: FRAMEWORK_LABEL + '/stack-name',
};
