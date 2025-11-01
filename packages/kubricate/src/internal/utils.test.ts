/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it } from 'vitest';

import type { BaseStack } from '../stack/BaseStack.js';
import type { ResourceComposer, ResourceEntry } from '../stack/ResourceComposer.js';
import type { KubricateConfig } from '../types.js';
import {
  censorSecretPayload,
  extractKindFromResourceEntry,
  extractStackInfo,
  extractStackInfoFromConfig,
  getClassName,
  getStackName,
  validateId,
  validateString,
} from './utils.js';

describe('validateString', () => {
  it('should not throw for string values', () => {
    expect(() => validateString('hello')).not.toThrow();
  });

  it('should throw TypeError for non-string values', () => {
    const invalidValues = [42, true, null, undefined, {}, [], () => {}];

    for (const value of invalidValues) {
      expect(() => validateString(value)).toThrowError(TypeError);
      expect(() => validateString(value)).toThrowError(/Expected a string, but received:/);
    }
  });
});

describe('getClassName', () => {
  it('should return constructor name for object instances', () => {
    class MyClass {}
    const instance = new MyClass();

    expect(getClassName(instance)).toBe('MyClass');
    expect(getClassName([])).toBe('Array');
    expect(getClassName({})).toBe('Object');
    expect(getClassName(new Date())).toBe('Date');
  });

  it('should return "Unknown" for primitives and null/undefined', () => {
    expect(getClassName(null)).toBe('Unknown');
    expect(getClassName(undefined)).toBe('Unknown');
    expect(getClassName('string')).toBe('Unknown');
    expect(getClassName(123)).toBe('Unknown');
    expect(getClassName(true)).toBe('Unknown');
  });
});

describe('extractKindFromResourceEntry', () => {
  it('should extract kind from class entry using type name', () => {
    class Deployment {}
    const entry: ResourceEntry = {
      entryType: 'class',
      type: Deployment,
      config: {},
    };

    expect(extractKindFromResourceEntry(entry)).toBe('Deployment');
  });

  it('should extract kind from object entry using config.kind', () => {
    const entry: ResourceEntry = {
      entryType: 'object',
      config: { kind: 'Service' },
    };

    expect(extractKindFromResourceEntry(entry)).toBe('Service');
  });

  it('should return "Unknown" for object entry without kind in config', () => {
    const entry: ResourceEntry = {
      entryType: 'object',
      config: {},
    };

    expect(extractKindFromResourceEntry(entry)).toBe('Unknown');
  });

  it('should return "Unknown" for instance entry', () => {
    const entry: ResourceEntry = {
      entryType: 'instance',
      config: {},
    };

    expect(extractKindFromResourceEntry(entry)).toBe('Unknown');
  });

  it('should handle class with complex names', () => {
    class StatefulSet {}
    const entry: ResourceEntry = {
      entryType: 'class',
      type: StatefulSet,
      config: {},
    };

    expect(extractKindFromResourceEntry(entry)).toBe('StatefulSet');
  });
});

describe('validateId', () => {
  describe('valid IDs', () => {
    it('should accept alphanumeric characters', () => {
      expect(() => validateId('abc123')).not.toThrow();
      expect(() => validateId('ABC123')).not.toThrow();
      expect(() => validateId('MyApp123')).not.toThrow();
    });

    it('should accept hyphens and underscores', () => {
      expect(() => validateId('my-app')).not.toThrow();
      expect(() => validateId('my_app')).not.toThrow();
      expect(() => validateId('my-app_v2')).not.toThrow();
    });

    it('should accept IDs up to 63 characters', () => {
      const validId = 'a'.repeat(63);
      expect(() => validateId(validId)).not.toThrow();
    });
  });

  describe('invalid IDs', () => {
    it('should reject special characters', () => {
      expect(() => validateId('my.app')).toThrow(/Invalid id "my.app"/);
      expect(() => validateId('my@app')).toThrow(/Invalid id "my@app"/);
      expect(() => validateId('my app')).toThrow(/Invalid id "my app"/);
      expect(() => validateId('my/app')).toThrow(/Invalid id "my\/app"/);
    });

    it('should reject empty strings', () => {
      expect(() => validateId('')).toThrow(/Invalid id ""/);
    });

    it('should reject IDs longer than 63 characters', () => {
      const invalidId = 'a'.repeat(64);
      expect(() => validateId(invalidId)).toThrow(/Must not exceed 63 characters/);
    });

    it('should use custom subject in error message', () => {
      expect(() => validateId('invalid!', 'stackId')).toThrow(/Invalid stackId "invalid!"/);
      expect(() => validateId('x'.repeat(64), 'resourceId')).toThrow(/Invalid resourceId/);
    });
  });
});

describe('getStackName', () => {
  it('should return stack name when getName() returns a value', () => {
    const mockStack = {
      getName: () => 'my-app-stack',
    } as BaseStack;

    expect(getStackName(mockStack)).toBe('my-app-stack');
  });

  it('should return class name when getName() returns null', () => {
    class AppStack {}
    const mockStack = Object.create(AppStack.prototype);
    mockStack.getName = () => null;

    expect(getStackName(mockStack)).toBe('AppStack');
  });

  it('should return class name when getName() returns undefined', () => {
    class DatabaseStack {}
    const mockStack = Object.create(DatabaseStack.prototype);
    mockStack.getName = () => undefined;

    expect(getStackName(mockStack)).toBe('DatabaseStack');
  });

  it('should return class name when getName() returns empty string', () => {
    class MyStack {}
    const mockStack = Object.create(MyStack.prototype);
    mockStack.getName = () => '';

    expect(getStackName(mockStack)).toBe('MyStack');
  });
});

describe('extractStackInfo', () => {
  it('should extract stack info with single resource', () => {
    class Deployment {}
    const mockComposer = {
      _entries: {
        deployment: {
          entryType: 'class',
          type: Deployment,
          config: {},
        },
      },
    } as any;

    const mockStack = {
      getName: () => 'my-app',
      getComposer: () => mockComposer,
    } as BaseStack;

    const info = extractStackInfo('my-app', mockStack);

    expect(info).toEqual({
      name: 'my-app',
      type: 'my-app',
      kinds: [{ id: 'deployment', kind: 'Deployment' }],
    });
  });

  it('should extract stack info with multiple resources', () => {
    class Deployment {}
    const mockComposer = {
      _entries: {
        deployment: { entryType: 'class', type: Deployment, config: {} },
        service: { entryType: 'object', config: { kind: 'Service' } },
        configmap: { entryType: 'object', config: { kind: 'ConfigMap' } },
      },
    } as any;

    const mockStack = {
      getName: () => null,
      getComposer: () => mockComposer,
    } as any;

    class AppStack {}
    Object.setPrototypeOf(mockStack, AppStack.prototype);

    const info = extractStackInfo('my-app', mockStack);

    expect(info.name).toBe('my-app');
    expect(info.type).toBe('AppStack');
    expect(info.kinds).toHaveLength(3);
    expect(info.kinds).toContainEqual({ id: 'deployment', kind: 'Deployment' });
    expect(info.kinds).toContainEqual({ id: 'service', kind: 'Service' });
    expect(info.kinds).toContainEqual({ id: 'configmap', kind: 'ConfigMap' });
  });

  it('should throw error when stack has no composer', () => {
    const mockStack = {
      getName: () => 'my-app',
      getComposer: () => null,
    } as unknown as BaseStack;

    expect(() => extractStackInfo('my-app', mockStack)).toThrow('Stack my-app does not have a composer.');
  });

  it('should handle empty composer entries', () => {
    const mockComposer = {
      _entries: {},
    } as ResourceComposer;

    const mockStack = {
      getName: () => 'empty-stack',
      getComposer: () => mockComposer,
    } as BaseStack;

    const info = extractStackInfo('empty-stack', mockStack);

    expect(info).toEqual({
      name: 'empty-stack',
      type: 'empty-stack',
      kinds: [],
    });
  });
});

describe('extractStackInfoFromConfig', () => {
  it('should extract info from single stack', () => {
    class Deployment {}
    const mockComposer = {
      _entries: {
        deployment: { entryType: 'class', type: Deployment, config: {} },
      },
    } as any;

    const mockStack = {
      getName: () => 'my-app',
      getComposer: () => mockComposer,
    } as BaseStack;

    const config: KubricateConfig = {
      stacks: {
        app: mockStack,
      },
    };

    const infos = extractStackInfoFromConfig(config);

    expect(infos).toHaveLength(1);
    expect(infos[0].name).toBe('app');
    expect(infos[0].kinds[0].kind).toBe('Deployment');
  });

  it('should extract info from multiple stacks', () => {
    class Deployment {}
    class StatefulSet {}

    const appComposer = {
      _entries: {
        deployment: { entryType: 'class', type: Deployment, config: {} },
      },
    } as any;

    const dbComposer = {
      _entries: {
        statefulset: { entryType: 'class', type: StatefulSet, config: {} },
      },
    } as any;

    const appStack = {
      getName: () => 'AppStack',
      getComposer: () => appComposer,
    } as BaseStack;

    const dbStack = {
      getName: () => 'DatabaseStack',
      getComposer: () => dbComposer,
    } as BaseStack;

    const config: KubricateConfig = {
      stacks: {
        app: appStack,
        db: dbStack,
      },
    };

    const infos = extractStackInfoFromConfig(config);

    expect(infos).toHaveLength(2);
    expect(infos[0].name).toBe('app');
    expect(infos[0].type).toBe('AppStack');
    expect(infos[1].name).toBe('db');
    expect(infos[1].type).toBe('DatabaseStack');
  });

  it('should handle empty stacks object', () => {
    const config: KubricateConfig = {
      stacks: {},
    };

    const infos = extractStackInfoFromConfig(config);

    expect(infos).toEqual([]);
  });

  it('should handle undefined stacks', () => {
    const config: KubricateConfig = {};

    const infos = extractStackInfoFromConfig(config);

    expect(infos).toEqual([]);
  });
});

describe('censorSecretPayload', () => {
  it('should censor values in data field', () => {
    const payload = {
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
    };

    const censored = censorSecretPayload(payload) as any;

    expect(censored.data.username).toBe('***');
    expect(censored.data.password).toBe('***');
    expect(censored.metadata.name).toBe('my-secret');
    expect(censored.kind).toBe('Secret');
  });

  it('should censor values in stringData field', () => {
    const payload = {
      apiVersion: 'v1',
      kind: 'Secret',
      metadata: {
        name: 'my-secret',
        namespace: 'default',
      },
      type: 'Opaque',
      stringData: {
        username: 'admin',
        password: 'password123',
      },
    };

    const censored = censorSecretPayload(payload) as any;

    expect(censored.stringData.username).toBe('***');
    expect(censored.stringData.password).toBe('***');
    expect(censored.metadata.name).toBe('my-secret');
  });

  it('should censor both data and stringData fields', () => {
    const payload = {
      apiVersion: 'v1',
      kind: 'Secret',
      metadata: {
        name: 'my-secret',
      },
      data: {
        key1: 'dmFsdWUx',
      },
      stringData: {
        key2: 'value2',
      },
    };

    const censored = censorSecretPayload(payload) as any;

    expect(censored.data.key1).toBe('***');
    expect(censored.stringData.key2).toBe('***');
  });

  it('should handle SSH auth secret type', () => {
    const payload = {
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
    };

    const censored = censorSecretPayload(payload) as any;

    expect(censored.data['ssh-privatekey']).toBe('***');
    expect(censored.data['known_hosts']).toBe('***');
    expect(censored.type).toBe('kubernetes.io/ssh-auth');
  });

  it('should handle payload without data or stringData fields', () => {
    const payload = {
      apiVersion: 'v1',
      kind: 'Secret',
      metadata: {
        name: 'my-secret',
      },
    };

    const censored = censorSecretPayload(payload) as any;

    expect(censored.metadata.name).toBe('my-secret');
    expect(censored.data).toBeUndefined();
    expect(censored.stringData).toBeUndefined();
  });

  it('should not mutate the original payload', () => {
    const payload = {
      apiVersion: 'v1',
      kind: 'Secret',
      metadata: {
        name: 'my-secret',
      },
      data: {
        username: 'YWRtaW4=',
      },
    };

    const original = JSON.stringify(payload);
    censorSecretPayload(payload);

    expect(JSON.stringify(payload)).toBe(original);
    expect((payload as any).data.username).toBe('YWRtaW4=');
  });

  it('should handle null payload', () => {
    const censored = censorSecretPayload(null);
    expect(censored).toBeNull();
  });

  it('should handle undefined payload', () => {
    const censored = censorSecretPayload(undefined);
    expect(censored).toBeUndefined();
  });

  it('should handle non-object payload', () => {
    expect(censorSecretPayload('string')).toBe('string');
    expect(censorSecretPayload(123)).toBe(123);
    expect(censorSecretPayload(true)).toBe(true);
  });

  it('should handle empty data field', () => {
    const payload = {
      apiVersion: 'v1',
      kind: 'Secret',
      metadata: {
        name: 'my-secret',
      },
      data: {},
    };

    const censored = censorSecretPayload(payload) as any;

    expect(censored.data).toEqual({});
  });

  it('should handle docker config secret type', () => {
    const payload = {
      apiVersion: 'v1',
      kind: 'Secret',
      metadata: {
        name: 'docker-registry',
        namespace: 'default',
      },
      type: 'kubernetes.io/dockerconfigjson',
      data: {
        '.dockerconfigjson': 'eyJhdXRocyI6eyJyZWdpc3RyeS5leGFtcGxlLmNvbSI6eyJ1c2VybmFtZSI6InVzZXIi...',
      },
    };

    const censored = censorSecretPayload(payload) as any;

    expect(censored.data['.dockerconfigjson']).toBe('***');
    expect(censored.type).toBe('kubernetes.io/dockerconfigjson');
  });
});
