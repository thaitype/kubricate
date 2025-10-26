# Pre Development Analysis Document

## 1) Introduction

### Why we do this work?

Currently, Kubricate provides two categories of secret providers:

1. **Fully unstructured**: `OpaqueSecretProvider` - accepts any key/value pairs without type constraints
2. **Highly specialized**: `BasicAuthSecretProvider`, `TlsSecretProvider`, `SshAuthSecretProvider` - fixed key sets with known semantics

There is a gap for teams that need to:
- Create **custom Secret types** (e.g., `type: vendor.com/custom`, `my.company/api-token`)
- Define their own Kubernetes Secret `type` field
- Use dynamic keys with optional validation
- Avoid writing a full bespoke provider for simple custom types
- Integrate with third-party systems or internal conventions that require specific secret types

The `CustomTypeSecretProvider` fills this gap by providing a flexible, reusable solution for user-defined secret types without requiring teams to write their own provider implementation from scratch.

## 2) Impact Analysis

### List of system/functions impacted by this implementation

**New Components:**
- New provider class: `CustomTypeSecretProvider` in `packages/plugin-kubernetes/src/providers/`
- Export from `packages/plugin-kubernetes/src/index.ts`

**Existing Components to Reference/Reuse:**
- `BaseProvider` from `@kubricate/core` - base class to extend
- `createKubernetesMergeHandler()` - for Secret deduplication logic
- Validation patterns from existing providers:
  - Strategy consistency checks (from `OpaqueSecretProvider`, `TlsSecretProvider`)
  - EnvFrom prefix validation
  - Duplicate key conflict detection
- TypeScript types:
  - `ProviderInjection`, `PreparedEffect`, `InjectionPayload` from core
  - Kubernetes Secret types from `kubernetes-models`

**Documentation & Examples:**
- New example in `examples/` directory (or extend `with-secret-manager`)
- README updates in `packages/plugin-kubernetes/`
- Potentially update main project README

**No Breaking Changes Expected:**
- This is a pure addition, no modifications to existing providers
- Follows established provider contract and patterns

## 3) Tasks

### Plan to Code/Proof of Concept Action

#### Phase 1: Core Implementation
1. **Create provider class structure**
   - Location: `packages/plugin-kubernetes/src/providers/CustomTypeSecretProvider.ts`
   - Define config interface:
     ```ts
     interface CustomTypeSecretProviderConfig {
       name: string;
       namespace?: string;
       secretType: string;
       allowedKeys?: readonly string[];
     }
     ```
   - Extend `BaseProvider<Record<string, string>>`

2. **Implement `prepare()` method**
   - Accept `name: string` and `value: Record<string, string>`
   - Apply key validation if `allowedKeys` is configured
   - Build Kubernetes Secret manifest with:
     - `type: config.secretType`
     - `data: {}` with base64-encoded values
     - Proper metadata (name, namespace, labels)
   - Return `PreparedEffect[]` array

3. **Implement `getInjectionPayload()` method**
   - Support `env` strategy (single key extraction)
   - Support `envFrom` strategy (all keys with optional prefix)
   - Validate strategy consistency (all env or all envFrom)
   - Check prefix consistency for envFrom
   - Detect duplicate key conflicts
   - Return appropriate `InjectionPayload` structure

4. **Implement `mergeSecrets()` method**
   - Use `createKubernetesMergeHandler()` for deduplication
   - Merge by `namespace/name` key
   - Handle data key conflicts appropriately

#### Phase 2: Validation & Error Handling
5. **Add validation logic**
   - allowedKeys validation (runtime check against provided keys)
   - Strategy mixing validation (reuse from other providers)
   - Prefix conflict validation for envFrom

6. **Add comprehensive error messages**
   - Mirror tone of existing providers
   - Clear actionable feedback for:
     - Disallowed keys
     - Strategy conflicts
     - Missing targetName

#### Phase 3: Testing & Documentation
7. **Create comprehensive test suite**
   - Location: `packages/plugin-kubernetes/src/providers/CustomTypeSecretProvider.test.ts`
   - Test all scenarios listed in section 4

8. **Export and integrate**
   - Add to `packages/plugin-kubernetes/src/index.ts` exports
   - Update package README

9. **Create example usage**
   - Either new example or extend `examples/with-secret-manager/`
   - Show real-world use case (e.g., vendor.com/custom type)

10. **Documentation updates**
    - Update plugin-kubernetes README
    - Add API documentation
    - Consider adding to main project README

## 4) Test case from developer

### Test case - how developers plan to test this case to demonstrate the work has been completed

#### Unit Tests (Vitest)

**1. Basic Secret Creation**
```ts
test('should create Secret with custom type', () => {
  const provider = new CustomTypeSecretProvider({
    name: 'custom-secret',
    namespace: 'test',
    secretType: 'vendor.com/custom',
  });

  const effects = provider.prepare('API_TOKEN', {
    api_key: 'secret-value',
    endpoint: 'https://api.example.com',
  });

  expect(effects).toHaveLength(1);
  expect(effects[0].resource.type).toBe('vendor.com/custom');
  expect(effects[0].resource.data).toBeDefined();
  // Verify base64 encoding
});
```

**2. Env Injection Strategy**
```ts
test('should inject single key as env variable', () => {
  const provider = new CustomTypeSecretProvider({
    name: 'custom-secret',
    secretType: 'vendor.com/token',
  });

  provider.prepare('API_TOKEN', { token: 'abc123', url: 'https://api.com' });

  const payload = provider.getInjectionPayload([{
    providerId: 'custom',
    provider,
    resourceId: 'deployment',
    path: 'spec.template.spec.containers[0].env',
    meta: {
      secretName: 'API_TOKEN',
      targetName: 'VENDOR_TOKEN',
      strategy: { kind: 'env', key: 'token' },
    },
  }]);

  expect(payload.kind).toBe('env');
  expect(payload.envVars).toContainEqual({
    name: 'VENDOR_TOKEN',
    valueFrom: expect.objectContaining({
      secretKeyRef: expect.objectContaining({
        name: 'custom-secret',
        key: 'token',
      }),
    }),
  });
});
```

**3. EnvFrom Injection Strategy**
```ts
test('should inject all keys as envFrom', () => {
  const provider = new CustomTypeSecretProvider({
    name: 'custom-secret',
    secretType: 'acme.corp/config',
  });

  provider.prepare('CONFIG', { key1: 'val1', key2: 'val2' });

  const payload = provider.getInjectionPayload([{
    providerId: 'custom',
    provider,
    resourceId: 'deployment',
    path: 'spec.template.spec.containers[0].envFrom',
    meta: {
      secretName: 'CONFIG',
      strategy: { kind: 'envFrom', prefix: 'APP_' },
    },
  }]);

  expect(payload.kind).toBe('envFrom');
  expect(payload.envFromSources).toContainEqual({
    secretRef: { name: 'custom-secret' },
    prefix: 'APP_',
  });
});
```

**4. AllowedKeys Validation**
```ts
test('should enforce allowedKeys constraint', () => {
  const provider = new CustomTypeSecretProvider({
    name: 'restricted-secret',
    secretType: 'vendor.com/api',
    allowedKeys: ['api_key', 'endpoint'],
  });

  expect(() => {
    provider.prepare('API', { api_key: 'abc', invalid_key: 'xyz' });
  }).toThrow(/invalid_key.*not allowed/i);
});
```

**5. Strategy Mixing Validation**
```ts
test('should reject mixed strategies', () => {
  const provider = new CustomTypeSecretProvider({
    name: 'mixed-secret',
    secretType: 'test/mixed',
  });

  provider.prepare('MIXED', { key1: 'val1', key2: 'val2' });

  expect(() => {
    provider.getInjectionPayload([
      {
        providerId: 'custom',
        provider,
        resourceId: 'deployment',
        path: 'spec.template.spec.containers[0].env',
        meta: {
          secretName: 'MIXED',
          targetName: 'KEY1',
          strategy: { kind: 'env', key: 'key1' },
        },
      },
      {
        providerId: 'custom',
        provider,
        resourceId: 'deployment',
        path: 'spec.template.spec.containers[0].envFrom',
        meta: {
          secretName: 'MIXED',
          strategy: { kind: 'envFrom' },
        },
      },
    ]);
  }).toThrow(/mixed.*strateg/i);
});
```

**6. Secret Merging**
```ts
test('should merge duplicate secrets correctly', () => {
  const provider = new CustomTypeSecretProvider({
    name: 'merge-secret',
    namespace: 'default',
    secretType: 'test/merge',
  });

  const effects1 = provider.prepare('TOKEN1', { key: 'value1' });
  const effects2 = provider.prepare('TOKEN2', { key: 'value2' });

  const merged = provider.mergeSecrets([...effects1, ...effects2]);

  // Should merge into single secret with both keys
  expect(merged).toHaveLength(1);
  expect(merged[0].resource.data).toHaveProperty('key');
});
```

#### Integration Test (Example)

**7. End-to-End Example**
- Create a working example in `examples/with-custom-type-secret/`
- Configure SecretManager with CustomTypeSecretProvider
- Inject secrets into a Deployment
- Run `kubricate generate` and verify output manifests
- Verify the generated YAML contains:
  - Secret with custom type
  - Proper env/envFrom references in Deployment

#### Manual Testing Checklist

- [ ] Build passes: `pnpm build`
- [ ] Tests pass: `pnpm test --filter=@kubricate/plugin-kubernetes`
- [ ] Linting passes: `pnpm lint:check`
- [ ] Example runs: `pnpm --filter=@examples/with-custom-type-secret kubricate generate`
- [ ] Generated YAML is valid Kubernetes manifest
- [ ] TypeScript types provide good DX (autocomplete, type safety)
