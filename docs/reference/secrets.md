# 🔐 Secrets Management in Kubricate

Kubricate provides a **type-safe, pluggable, and orchestrated secret management system** for Kubernetes and beyond.


It abstracts how secrets are:
1. **Loaded** (from `.env`, cloud secret managers, Vault, etc.)
2. **Provided** (as Kubernetes Secret, annotations, Helm values, etc.)
3. **Injected** (into resources like Deployments, Jobs, Helm Charts)


## 💡 Philosophy

- 🧠 **Type-safe** – Strategy types are enforced per provider
- 🔁 **Declarative** – Describe what to inject, not how
- 🧩 **Composable** – Secrets can be reused across resources and stacks
- ⚠️ **Safe by default** – Prevent conflicts unless explicitly configured
- 🛠️ **Extensible** – Write your own connectors and providers


## 🧱 Core Concepts

### 1. **SecretManager**
A central registry for managing secret lifecycle in a stack.

- Load secrets from various sources via **Connectors**
- Deliver secrets to destinations via **Providers**
- Can use mulitple SecretManagers per Stack
- Can register multiple secrets and control provider per secret

```ts
const secretManager = new SecretManager()
  .addConnector('env', new EnvConnector())
  .addProvider('kube', new OpaqueSecretProvider({ name: 'my-secret' }))
  .addSecret({ name: 'DB_PASSWORD', provider: 'kube' });
```

### 2. **Connector**
Responsible for **loading secret values** from sources.

Built-in connectors:
- `.env` files (`EnvConnector`)
- JSON files
- Secrets from external systems (e.g., Vault, AWS, Azure — via plugins)

```ts
// .env
DB_PASSWORD=supersecret
```

```ts
secretManager.addConnector('env', new EnvConnector());
```



### 3. **Provider**
Responsible for **how secrets are delivered to the cluster**.

Examples:
- `OpaqueSecretProvider` → inject into Kubernetes Secret for env vars
- `DockerConfigSecretProvider` → Docker registry credentials
- `VaultAnnotationProvider` (planned) → inject annotations for Vault agent injection
- `HelmSecretProvider` (planned) → inject into Helm `values.yaml`

Each provider:
- Knows how to format secret output
- Knows where to inject it (env, volume, annotation)
- Implements `.prepare()` to generate kubectl YAMLs
- Implements `.getInjectionPayload()` to inject into resources


### 4. **Injection Strategy**
Defines **how** and **where** a secret will be injected into a resource.

```ts
injector.secrets('DB_PASSWORD')
  .inject({ kind: 'env', containerIndex: 0 });
```

You can also use `.forName()` to override the env var or key name:

```ts
injector.secrets('API_KEY')
  .forName('CUSTOM_ENV_KEY')
  .inject('env', { containerIndex: 1 });
```

- 
### 🧪 Supported Kinds

| Kind              | Description                       | Status    |
| ----------------- | --------------------------------- | --------- |
| `env`             | Inject into container env[]       | ✅ Stable  |
| `volume`          | Inject as mounted file            | ⏳ Planned |
| `annotation`      | Inject into metadata.annotations  | ⏳ Planned |
| `imagePullSecret` | Add to `imagePullSecrets[]`       | ✅ Stable  |
| `plugin`          | Custom provider-defined injection | ✅ Stable  |
| `helm`            | Inject into Helm values           | ⏳ Planned |

> ℹ️ **Note**: You can implement custom kinds using `plugin` and `transform()`.


## ✨ Example

```ts
new AppStack()
  .useSecrets(secretManager, (injector) => {
    injector.setDefaultResourceId('deployment');

    injector.secrets('DB_PASSWORD')
      .forName('POSTGRES_PASSWORD')
      .inject('env', { containerIndex: 0 });

    injector.secrets('DOCKER_SECRET')
      .inject('imagePullSecret')
      .intoResource('deployment_1');

    injector.secrets('VAULT_TOKEN')
      .inject('plugin', {
        action: 'vault-annotation',
        args: ['vault.hashicorp.com/secret', 'secret/data/myapp']
      });
  });
```
## 🧩 Extending Secrets System

You can build your own:

| Extension Type | Example Use Case                      |
| -------------- | ------------------------------------- |
| `Connector`       | Load from Azure Key Vault or REST API |
| `Provider`     | Inject HashiCorp Vault                |

```ts
export class MyProvider implements BaseProvider {
  /**
   * prepare() is used to provision secret values into the cluster or remote backend.
   * It is only called during `kubricate secret apply`.
   *
   * It should return the full secret resource (e.g., Kubernetes Secret, Vault payload).
   */
  prepare(name: string, value: SecretValue): PreparedEffect[];

  /**
   * getInjectionPayload() is used to return runtime resource values (e.g., container.env).
   * This is used during manifest generation (`kubricate generate`) and must be pure.
   */
  getInjectionPayload(injectes: ProviderInjection[]): unknown;

  /**
   * Return the Kubernetes path this provider expects for a given strategy.
   * This is used to generate the target path in the manifest for injection.
   */
  getTargetPath(strategy: SecretInjectionStrategy): string;
}
```


## 🧪 Validation & CLI Commands

Use `kubricate` CLI to validate and apply secrets:

```bash
kubricate secret validate     # Ensure config and secrets are valid
kubricate secret apply        # Generate and apply Kubernetes Secrets
kubricate generate            # Render full manifests
```
