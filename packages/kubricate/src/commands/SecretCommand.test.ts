/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, vi } from 'vitest';

import type { BaseLogger } from '@kubricate/core';

import type { KubectlExecutor } from '../executor/kubectl-executor.js';
import type { GlobalConfigOptions } from '../internal/types.js';
import type { SecretsOrchestrator } from '../secret/index.js';
import { SecretCommand } from './SecretCommand.js';

describe('SecretCommand', () => {
  describe('apply', () => {
    it('should censor secret values in dry-run mode', async () => {
      // Mock logger
      const logMessages: string[] = [];
      const mockLogger: BaseLogger = {
        level: 'info',
        info: (msg: string) => logMessages.push(`INFO: ${msg}`),
        log: (msg: string) => logMessages.push(`LOG: ${msg}`),
        warn: (msg: string) => logMessages.push(`WARN: ${msg}`),
        error: (msg: string) => logMessages.push(`ERROR: ${msg}`),
        debug: (msg: string) => logMessages.push(`DEBUG: ${msg}`),
      };

      // Mock kubectl executor
      const mockKubectl: KubectlExecutor = {
        apply: vi.fn(),
      } as any;

      // Mock options with dryRun enabled
      const mockOptions: GlobalConfigOptions = {
        dryRun: true,
        root: '/test',
        silent: false,
        verbose: false,
      };

      // Mock orchestrator
      const mockEffect = {
        type: 'kubectl' as const,
        value: {
          apiVersion: 'v1',
          kind: 'Secret',
          metadata: {
            name: 'deploy-ssh-credentials',
            namespace: 'default',
          },
          type: 'kubernetes.io/ssh-auth',
          data: {
            'ssh-privatekey': 'LS0tLS1CRUdJTiBPUEVOU1NIIFBSSVZBVEUgS0VZLS0tLS0K...',
            known_hosts: 'ZGVwbG95LXNlcnZlci5leGFtcGxlLmNvbSBzc2gtcnNhIEFBQUFCM056YUMx...',
          },
        },
      };

      const mockOrchestrator: SecretsOrchestrator = {
        validate: vi.fn().mockResolvedValue(undefined),
        apply: vi.fn().mockResolvedValue([mockEffect]),
      } as any;

      // Create command instance
      const command = new SecretCommand(mockOptions, mockLogger, mockKubectl);

      // Execute apply
      await command.apply(mockOrchestrator);

      // Verify validate was called
      expect(mockOrchestrator.validate).toHaveBeenCalled();

      // Verify kubectl.apply was NOT called in dry-run mode
      expect(mockKubectl.apply).not.toHaveBeenCalled();

      // Find the log message with the payload
      const payloadLog = logMessages.find(msg => msg.includes('Would apply') && msg.includes('payload'));

      expect(payloadLog).toBeDefined();

      // Verify secret values are censored
      expect(payloadLog).toContain('"ssh-privatekey":"***"');
      expect(payloadLog).toContain('"known_hosts":"***"');

      // Verify actual secret values are NOT in the log
      expect(payloadLog).not.toContain('LS0tLS1CRUdJTiBPUEVOU1NIIFBSSVZBVEUgS0VZLS0tLS0K');
      expect(payloadLog).not.toContain('ZGVwbG95LXNlcnZlci5leGFtcGxlLmNvbSBzc2gtcnNhIEFBQUFCM056YUMx');
    });

    it('should not censor in non-dry-run mode', async () => {
      const mockLogger: BaseLogger = {
        level: 'info',
        info: vi.fn(),
        log: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      };

      const mockKubectl: KubectlExecutor = {
        apply: vi.fn().mockResolvedValue(undefined),
      } as any;

      const mockOptions: GlobalConfigOptions = {
        dryRun: false,
        root: '/test',
        silent: false,
        verbose: false,
      };

      const mockEffect = {
        type: 'kubectl' as const,
        value: {
          apiVersion: 'v1',
          kind: 'Secret',
          metadata: {
            name: 'my-secret',
            namespace: 'default',
          },
          type: 'Opaque',
          data: {
            username: 'YWRtaW4=',
            password: 'cGFzc3dvcmQxMjM=',
          },
        },
      };

      const mockOrchestrator: SecretsOrchestrator = {
        validate: vi.fn().mockResolvedValue(undefined),
        apply: vi.fn().mockResolvedValue([mockEffect]),
      } as any;

      const command = new SecretCommand(mockOptions, mockLogger, mockKubectl);

      await command.apply(mockOrchestrator);

      // Verify kubectl.apply WAS called in non-dry-run mode with original payload
      expect(mockKubectl.apply).toHaveBeenCalledWith(mockEffect.value);

      // Verify the original values were passed to kubectl (not censored)
      const appliedPayload = (mockKubectl.apply as any).mock.calls[0][0];
      expect(appliedPayload.data.username).toBe('YWRtaW4=');
      expect(appliedPayload.data.password).toBe('cGFzc3dvcmQxMjM=');
    });

    it('should handle multiple secrets in dry-run mode', async () => {
      const logMessages: string[] = [];
      const mockLogger: BaseLogger = {
        level: 'info',
        info: (msg: string) => logMessages.push(`INFO: ${msg}`),
        log: (msg: string) => logMessages.push(`LOG: ${msg}`),
        warn: (msg: string) => logMessages.push(`WARN: ${msg}`),
        error: (msg: string) => logMessages.push(`ERROR: ${msg}`),
        debug: (msg: string) => logMessages.push(`DEBUG: ${msg}`),
      };

      const mockKubectl: KubectlExecutor = {
        apply: vi.fn(),
      } as any;

      const mockOptions: GlobalConfigOptions = {
        dryRun: true,
        root: '/test',
        silent: false,
        verbose: false,
      };

      const mockEffects = [
        {
          type: 'kubectl' as const,
          value: {
            apiVersion: 'v1',
            kind: 'Secret',
            metadata: { name: 'secret-1' },
            data: { key1: 'value1' },
          },
        },
        {
          type: 'kubectl' as const,
          value: {
            apiVersion: 'v1',
            kind: 'Secret',
            metadata: { name: 'secret-2' },
            data: { key2: 'value2' },
          },
        },
      ];

      const mockOrchestrator: SecretsOrchestrator = {
        validate: vi.fn().mockResolvedValue(undefined),
        apply: vi.fn().mockResolvedValue(mockEffects),
      } as any;

      const command = new SecretCommand(mockOptions, mockLogger, mockKubectl);

      await command.apply(mockOrchestrator);

      const payloadLogs = logMessages.filter(msg => msg.includes('Would apply') && msg.includes('payload'));

      expect(payloadLogs).toHaveLength(2);
      expect(payloadLogs[0]).toContain('"key1":"***"');
      expect(payloadLogs[1]).toContain('"key2":"***"');
      expect(payloadLogs[0]).not.toContain('value1');
      expect(payloadLogs[1]).not.toContain('value2');
    });

    it('should handle empty effects array', async () => {
      const mockLogger: BaseLogger = {
        level: 'info',
        info: vi.fn(),
        log: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      };

      const mockKubectl: KubectlExecutor = {
        apply: vi.fn(),
      } as any;

      const mockOptions: GlobalConfigOptions = {
        dryRun: true,
        root: '/test',
        silent: false,
        verbose: false,
      };

      const mockOrchestrator: SecretsOrchestrator = {
        validate: vi.fn().mockResolvedValue(undefined),
        apply: vi.fn().mockResolvedValue([]),
      } as any;

      const command = new SecretCommand(mockOptions, mockLogger, mockKubectl);

      await command.apply(mockOrchestrator);

      expect(mockLogger.warn).toHaveBeenCalledWith('No secrets to apply.');
      expect(mockKubectl.apply).not.toHaveBeenCalled();
    });
  });

  describe('validate', () => {
    it('should call orchestrator validate', async () => {
      const mockLogger: BaseLogger = {
        level: 'info',
        info: vi.fn(),
        log: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      };

      const mockKubectl: KubectlExecutor = {
        apply: vi.fn(),
      } as any;

      const mockOptions: GlobalConfigOptions = {
        dryRun: false,
        root: '/test',
        silent: false,
        verbose: false,
      };

      const mockOrchestrator: SecretsOrchestrator = {
        validate: vi.fn().mockResolvedValue(undefined),
        apply: vi.fn(),
      } as any;

      const command = new SecretCommand(mockOptions, mockLogger, mockKubectl);

      await command.validate(mockOrchestrator);

      expect(mockOrchestrator.validate).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('Validating secrets configuration...');
    });
  });
});
