[Documentation](../../../index.md) / [secret/SecretInjectionBuilder](../index.md) / SecretInjectionBuilder

# Class: SecretInjectionBuilder\<Kinds\>

SecretInjectionBuilder provides a fluent API to define how a secret should be injected into a resource.

## Example

```ts
injector.secrets('MY_SECRET')
    .inject({ kind: 'env', containerIndex: 0 })
    .intoResource('my-deployment'); // Optional
```

## Type Parameters

### Kinds

`Kinds` *extends* [`SecretInjectionStrategy`](../../../BaseStack/type-aliases/SecretInjectionStrategy.md)\[`"kind"`\] = [`SecretInjectionStrategy`](../../../BaseStack/type-aliases/SecretInjectionStrategy.md)\[`"kind"`\]

## Constructors

### Constructor

```ts
new SecretInjectionBuilder<Kinds>(
   stack, 
   secretName, 
   provider, 
ctx): SecretInjectionBuilder<Kinds>;
```

#### Parameters

##### stack

[`BaseStack`](../../../BaseStack/classes/BaseStack.md)

##### secretName

`string`

##### provider

[`BaseProvider`](../../providers/BaseProvider/interfaces/BaseProvider.md)

##### ctx

###### defaultResourceId?

`string`

###### providerId

`string`

###### secretManagerId

`number`

#### Returns

`SecretInjectionBuilder`\<`Kinds`\>

## Methods

### forName()

```ts
forName(name): this;
```

Override the name to be injected into the target manifest.

This is useful when the name used inside the resource (e.g., env var name)
should differ from the registered secret name in the SecretManager.

If not provided, the original secret name will be used.

Example:
  .secrets('MY_SECRET').forName('API_KEY').inject({ kind: 'env' });

Output:
  - name: API_KEY
    valueFrom:
      secretKeyRef:
        name: secret-application
        key: MY_SECRET

#### Parameters

##### name

`string`

The name to use in the final manifest (e.g., environment variable name).

#### Returns

`this`

***

### inject()

#### Call Signature

```ts
inject(): this;
```

Define how this secret should be injected into the Kubernetes resource.

👉 You can call `.inject(strategy)` with a specific strategy, or use `.inject()` with no arguments
if the provider only supports **one** strategy kind (e.g. `'env'`).

This method is **type-safe** and enforces allowed `kind` values per provider via TypeScript inference.

##### Returns

`this`

##### Example

```ts
// Explicit strategy:
  injector.secrets('APP_SECRET').inject('env', { containerIndex: 0 });

  // Implicit (default strategy):
  injector.secrets('APP_SECRET').inject(); // uses first provider-supported default
```

#### Call Signature

```ts
inject(kind?, strategyOptions?): this;
```

Define how this secret should be injected into the Kubernetes resource.

👉 You can call `.inject(strategy)` with a specific strategy, or use `.inject()` with no arguments
if the provider only supports **one** strategy kind (e.g. `'env'`).

This method is **type-safe** and enforces allowed `kind` values per provider via TypeScript inference.

##### Parameters

###### kind?

`ExtractAllowedKinds`\<`Kinds`\>\[`"kind"`\]

###### strategyOptions?

`Omit`\<[`FallbackIfNever`](../../../types/type-aliases/FallbackIfNever.md)\<`ExtractAllowedKinds`\<`Kinds`\>, [`SecretInjectionStrategy`](../../../BaseStack/type-aliases/SecretInjectionStrategy.md)\>, `"kind"`\>

##### Returns

`this`

##### Example

```ts
// Explicit strategy:
  injector.secrets('APP_SECRET').inject('env', { containerIndex: 0 });

  // Implicit (default strategy):
  injector.secrets('APP_SECRET').inject(); // uses first provider-supported default
```

***

### intoResource()

```ts
intoResource(resourceId): this;
```

Explicitly define the resource ID that defined in the composer e.g. 'my-deployment', 'my-job' to inject into.

#### Parameters

##### resourceId

`string`

#### Returns

`this`

***

### resolveDefaultStrategy()

```ts
resolveDefaultStrategy(kind): SecretInjectionStrategy;
```

Resolves a default injection strategy based on the `kind` supported by the provider.
This allows `.inject()` to be used without arguments when the provider supports exactly one kind.

Each kind has its own defaults:
- `env` → `{ kind: 'env', containerIndex: 0 }`
- `imagePullSecret` → `{ kind: 'imagePullSecret' }`
- `annotation` → `{ kind: 'annotation' }`

If the kind is unsupported for defaulting, an error is thrown.

#### Parameters

##### kind

`"env"` | `"volume"` | `"annotation"` | `"imagePullSecret"` | `"envFrom"` | `"plugin"`

#### Returns

[`SecretInjectionStrategy`](../../../BaseStack/type-aliases/SecretInjectionStrategy.md)

***

### resolveInjection()

```ts
resolveInjection(): void;
```

Resolve and register the final injection into the stack.
Should be called by SecretsInjectionContext after the injection chain ends.

#### Returns

`void`
