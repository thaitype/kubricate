[Documentation](../../index.md) / [OpaqueSecretProvider](../index.md) / EnvVar

# Interface: EnvVar

EnvVar represents an environment variable present in a Container.

Ported from import { IEnvVar } from 'kubernetes-models/v1/EnvVar';
import ProviderInjection from '@kubricate/core';

## Properties

### name

```ts
name: string;
```

Name of the environment variable. Must be a C_IDENTIFIER.

***

### value?

```ts
optional value: string;
```

Variable references $(VAR_NAME) are expanded using the previously defined environment variables in the container and any service environment variables. If a variable cannot be resolved, the reference in the input string will be unchanged. Double $$ are reduced to a single $, which allows for escaping the $(VAR_NAME) syntax: i.e. "$$(VAR_NAME)" will produce the string literal "$(VAR_NAME)". Escaped references will never be expanded, regardless of whether the variable exists or not. Defaults to "".

***

### valueFrom?

```ts
optional valueFrom: object;
```

Source for the environment variable's value. Cannot be used if value is not empty.

#### secretKeyRef?

```ts
optional secretKeyRef: object;
```

Selects a key of a secret in the pod's namespace

##### secretKeyRef.key

```ts
key: string;
```

The key of the secret to select from.  Must be a valid secret key.

##### secretKeyRef.name?

```ts
optional name: string;
```

Name of the referent. More info: https://kubernetes.io/docs/concepts/overview/working-with-objects/names/#names

##### secretKeyRef.optional?

```ts
optional optional: boolean;
```

Specify whether the Secret or its key must be defined
