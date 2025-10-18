# Issue-140: Feature Request: Add BasicAuthSecretProvider with key support for env injection

### Summary

Introduce a new `BasicAuthSecretProvider` that implements Kubernetes Secret type `kubernetes.io/basic-auth`.
It should support both `env` and `envFrom` injection strategies with minimal and consistent API design.

### Requirements

1. **Secret type**

   * Generated Secret must have type `kubernetes.io/basic-auth`.
   * Keys are fixed by Kubernetes spec: `username` and `password`.

2. **Injection Strategies**

   * **`env` (1:1 only)**

     * Require `.forName(<ENV_NAME>)`.
     * `strategy.key` is **mandatory** and must be either `'username'` or `'password'`.
     * Example:

       ```ts
       c.secrets('BASIC_AUTH').forName('API_USER').inject('env', { key: 'username' });
       c.secrets('BASIC_AUTH').forName('API_PASSWORD').inject('env', { key: 'password' });
       ```
     * If `key` is missing or not `'username' | 'password'`, throw a clear error.

   * **`envFrom`**

     * Inject the entire Secret (`username`, `password`) as environment variables.
     * Allow optional `prefix` (standard Kubernetes behavior).
     * Example:

       ```ts
       c.secrets('BASIC_AUTH').inject('envFrom'); 
       c.secrets('BASIC_AUTH').inject('envFrom', { prefix: 'BASIC_' });
       ```

3. **Error handling / validation**

   * Missing `.forName()` in `env` mode → error: `Missing targetName (.forName)`.
   * Invalid `key` in `env` mode → error: `key must be 'username' or 'password'`.
   * Duplicate environment variable names within a single container → throw conflict error.

4. **Design principle**

   * Keep `SecretInjectionStrategy` lean: only add `key?: string` to `env` strategy.
   * Providers decide whether `key` is required or ignored:

     * **BasicAuthSecretProvider**: `key` required (`username` / `password`)
     * **OpaqueSecretProvider**: `key` optional, falls back to current behavior
     * Other providers: may ignore or implement their own handling

### Motivation

* Provides first-class support for `kubernetes.io/basic-auth` secrets.
* Enables consistent developer experience: `.forName()` for ENV name + `key` for Secret key.
* Keeps the spec minimal and backward-compatible.
* Scales to future providers without overcomplicating the API.

### Acceptance Criteria

* Can generate valid Kubernetes Secret with type `kubernetes.io/basic-auth`.
* Can inject `username` and `password` into pods using either `env` (1:1) or `envFrom`.
* Fails fast and clearly if invalid `key` is provided.
* Opaque and other providers remain fully backward-compatible.
