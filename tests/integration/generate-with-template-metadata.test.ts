import fs from 'node:fs/promises';
import path from 'node:path';

import { rimraf } from 'rimraf';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { parse as parseYaml } from 'yaml';

import { executeKubricate } from '../helpers/execute-kubricate';

const rootDir = path.resolve(__dirname, '..');
const fixturesRoot = path.join(rootDir, 'fixtures');

describe('generate with template metadata e2e', () => {
  const fixtureDir = path.join(fixturesRoot, 'generate-template-metadata');
  const outputDir = path.join(fixtureDir, 'output');
  const outputFile = path.join(outputDir, 'stacks.yml');

  beforeEach(async () => {
    // Create fixture directory structure
    await fs.mkdir(fixtureDir, { recursive: true });

    // Create kubricate.config.ts that uses templates with metadata
    const configContent = `import { defineConfig } from 'kubricate';
import { namespaceTemplate, simpleAppTemplate } from '@kubricate/stacks';
import { Stack } from 'kubricate';

export default defineConfig({
  stacks: {
    namespace: Stack.fromTemplate(namespaceTemplate, { name: 'test-namespace' }),
    app: Stack.fromTemplate(simpleAppTemplate, {
      name: 'test-app',
      namespace: 'test-namespace',
      imageName: 'nginx',
    }),
  },
  generate: {
    outputMode: 'flat',
  },
  metadata: {
    // Disable dynamic fields for consistent testing
    injectManagedAt: false,
    injectVersion: false,
  },
});
`;

    await fs.writeFile(path.join(fixtureDir, 'kubricate.config.ts'), configContent, 'utf-8');
  });

  afterEach(async () => {
    // Clean up fixture directory
    await rimraf(fixtureDir);
  });

  it('should generate YAML with stack template metadata annotations', async () => {
    const args = ['generate', '--root', fixtureDir];
    const { stdout, exitCode } = await executeKubricate(args, { reject: false });

    expect(exitCode).toBe(0);
    expect(stdout).toContain('Generating stacks');

    // Verify output file exists
    const fileExists = await fs
      .access(outputFile)
      .then(() => true)
      .catch(() => false);
    expect(fileExists).toBe(true);

    // Read and parse YAML
    const yamlContent = await fs.readFile(outputFile, 'utf-8');

    // Split by "---" and parse each document separately
    const yamlDocs = yamlContent
      .split(/^---$/m)
      .filter(doc => doc.trim())
      .map(doc => parseYaml(doc));

    expect(yamlDocs.length).toBeGreaterThan(0);

    // Verify each resource has template metadata annotations
    for (const doc of yamlDocs) {
      expect(doc).toHaveProperty('metadata');
      expect(doc.metadata).toHaveProperty('annotations');

      const annotations = doc.metadata.annotations;

      // Verify stack-template-name annotation exists
      expect(annotations).toHaveProperty('kubricate.thaitype.dev/stack-template-name');
      expect(annotations['kubricate.thaitype.dev/stack-template-name']).toBeTruthy();

      // Verify stack-template-core-version annotation exists
      expect(annotations).toHaveProperty('kubricate.thaitype.dev/stack-template-core-version');
      expect(annotations['kubricate.thaitype.dev/stack-template-core-version']).toBeTruthy();

      // Verify stack-template-version annotation exists
      expect(annotations).toHaveProperty('kubricate.thaitype.dev/stack-template-version');
      expect(annotations['kubricate.thaitype.dev/stack-template-version']).toBeTruthy();

      // Verify stack-template-author annotation exists
      expect(annotations).toHaveProperty('kubricate.thaitype.dev/stack-template-author');
      expect(annotations['kubricate.thaitype.dev/stack-template-author']).toBeTruthy();

      // Verify stack-template-repository annotation exists
      expect(annotations).toHaveProperty('kubricate.thaitype.dev/stack-template-repository');
      expect(annotations['kubricate.thaitype.dev/stack-template-repository']).toBeTruthy();
    }
  });

  it('should inject correct template metadata values for namespace template', async () => {
    const args = ['generate', '--root', fixtureDir];
    const { exitCode } = await executeKubricate(args, { reject: false });

    expect(exitCode).toBe(0);

    const yamlContent = await fs.readFile(outputFile, 'utf-8');
    const yamlDocs = yamlContent
      .split(/^---$/m)
      .filter(doc => doc.trim())
      .map(doc => parseYaml(doc));

    // Find the Namespace resource
    const namespaceDoc = yamlDocs.find(doc => doc.kind === 'Namespace');
    expect(namespaceDoc).toBeDefined();

    const annotations = namespaceDoc!.metadata.annotations;

    // Verify specific values for namespace template
    expect(annotations['kubricate.thaitype.dev/stack-template-name']).toBe('@kubricate/stacks/namespace');
    expect(annotations['kubricate.thaitype.dev/stack-template-author']).toBe('Kubricate Team');
    expect(annotations['kubricate.thaitype.dev/stack-template-repository']).toBe(
      'https://github.com/thaitype/kubricate'
    );

    // Verify version is a valid semver string
    expect(annotations['kubricate.thaitype.dev/stack-template-version']).toMatch(/^\d+\.\d+\.\d+/);

    // Verify core version is a valid semver string
    expect(annotations['kubricate.thaitype.dev/stack-template-core-version']).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('should inject correct template metadata values for simple-app template', async () => {
    const args = ['generate', '--root', fixtureDir];
    const { exitCode } = await executeKubricate(args, { reject: false });

    expect(exitCode).toBe(0);

    const yamlContent = await fs.readFile(outputFile, 'utf-8');
    const yamlDocs = yamlContent
      .split(/^---$/m)
      .filter(doc => doc.trim())
      .map(doc => parseYaml(doc));

    // Find the Deployment resource (from simple-app template)
    const deploymentDoc = yamlDocs.find(doc => doc.kind === 'Deployment');
    expect(deploymentDoc).toBeDefined();

    const annotations = deploymentDoc!.metadata.annotations;

    // Verify specific values for simple-app template
    expect(annotations['kubricate.thaitype.dev/stack-template-name']).toBe('@kubricate/stacks/simple-app');
    expect(annotations['kubricate.thaitype.dev/stack-template-author']).toBe('Kubricate Team');
    expect(annotations['kubricate.thaitype.dev/stack-template-repository']).toBe(
      'https://github.com/thaitype/kubricate'
    );

    // Verify version is a valid semver string
    expect(annotations['kubricate.thaitype.dev/stack-template-version']).toMatch(/^\d+\.\d+\.\d+/);

    // Verify core version is a valid semver string
    expect(annotations['kubricate.thaitype.dev/stack-template-core-version']).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('should inject template metadata for all resources in a stack', async () => {
    const args = ['generate', '--root', fixtureDir];
    const { exitCode } = await executeKubricate(args, { reject: false });

    expect(exitCode).toBe(0);

    const yamlContent = await fs.readFile(outputFile, 'utf-8');
    const yamlDocs = yamlContent
      .split(/^---$/m)
      .filter(doc => doc.trim())
      .map(doc => parseYaml(doc));

    // Find all resources from the simple-app stack (Deployment and Service)
    const appResources = yamlDocs.filter(doc => doc.metadata?.labels?.['kubricate.thaitype.dev/stack-id'] === 'app');

    expect(appResources.length).toBeGreaterThan(0);

    // Verify all resources from the same stack have the same template metadata
    const firstResourceAnnotations = appResources[0].metadata.annotations;
    const templateName = firstResourceAnnotations['kubricate.thaitype.dev/stack-template-name'];
    const templateVersion = firstResourceAnnotations['kubricate.thaitype.dev/stack-template-version'];
    const templateAuthor = firstResourceAnnotations['kubricate.thaitype.dev/stack-template-author'];

    for (const resource of appResources) {
      const annotations = resource.metadata.annotations;

      // All resources from the same stack should have the same template metadata
      expect(annotations['kubricate.thaitype.dev/stack-template-name']).toBe(templateName);
      expect(annotations['kubricate.thaitype.dev/stack-template-version']).toBe(templateVersion);
      expect(annotations['kubricate.thaitype.dev/stack-template-author']).toBe(templateAuthor);
    }
  });

  it('should not share template metadata across different stacks', async () => {
    const args = ['generate', '--root', fixtureDir];
    const { exitCode } = await executeKubricate(args, { reject: false });

    expect(exitCode).toBe(0);

    const yamlContent = await fs.readFile(outputFile, 'utf-8');
    const yamlDocs = yamlContent
      .split(/^---$/m)
      .filter(doc => doc.trim())
      .map(doc => parseYaml(doc));

    // Find resources from different stacks
    const namespaceResources = yamlDocs.filter(
      doc => doc.metadata?.labels?.['kubricate.thaitype.dev/stack-id'] === 'namespace'
    );
    const appResources = yamlDocs.filter(doc => doc.metadata?.labels?.['kubricate.thaitype.dev/stack-id'] === 'app');

    expect(namespaceResources.length).toBeGreaterThan(0);
    expect(appResources.length).toBeGreaterThan(0);

    const namespaceTemplateName =
      namespaceResources[0].metadata.annotations['kubricate.thaitype.dev/stack-template-name'];
    const appTemplateName = appResources[0].metadata.annotations['kubricate.thaitype.dev/stack-template-name'];

    // Verify that different stacks have different template names
    expect(namespaceTemplateName).toBe('@kubricate/stacks/namespace');
    expect(appTemplateName).toBe('@kubricate/stacks/simple-app');
    expect(namespaceTemplateName).not.toBe(appTemplateName);
  });
});
