[Documentation](../../../index.md) / [secret/types](../index.md) / SecretValue

# Type Alias: SecretValue

```ts
type SecretValue = 
  | PrimitiveSecretValue
| Record<string, PrimitiveSecretValue>;
```

/**
SecretValue represents the expected format for secret values loaded by a BaseConnector
and consumed by a BaseProvider.

A SecretValue can be either:
- A single primitive (e.g., token, password, string literal)
- A flat object of key-value pairs, where each value is a primitive

All values must be serializable to string (e.g., for Kubernetes Secret encoding).
Nested objects, arrays, or non-serializable types are not supported.
