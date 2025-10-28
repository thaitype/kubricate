# Stacks & Templates

Stacks group related Kubernetes resources into reusable patterns. Templates make those patterns parameterizable and type-safe. Together, they turn repetitive YAML into composable infrastructure.

**Who this is for**: Engineers defining reusable stacks and establishing team patterns.

**You'll learn**: What stacks and templates are, how to create them, and design guidelines for building robust patterns.

**Prerequisites**: Basic TypeScript and Kubernetes resource knowledge.

---

## What Is a Stack

A Stack is a cohesive group of Kubernetes resources that serve a single purpose.

**Examples**:
- **WebApp Stack** — Deployment + Service + Ingress
- **CronJob Stack** — CronJob + ConfigMap
- **Namespace Stack** — Namespace (single resource)
- **Database Stack** — StatefulSet + Service + PersistentVolumeClaim

**Why Stacks Matter**:
- **Cohesion** — Related resources stay together
- **Reusability** — Define once, use everywhere
- **Type Safety** — TypeScript validates inputs at build time
- **Testing** — Unit test stacks in isolation

**How Stacks Work**:
1. Define a template function that returns a resource map
2. Create a stack instance with inputs
3. Optionally wire in secrets via `useSecrets()`
4. Call `build()` to get final resources

---

## Template System

Templates are parameterized functions that generate resource maps. They enable type-safe reusability across projects and teams.

### Template Diagram

```
Template Definition (compile-time)
         ↓
defineStackTemplate('MyApp', (input: Input) => resources)
         ↓
Stack Creation (runtime)
         ↓
Stack.fromTemplate(template, { name: 'app1', image: 'nginx' })
         ↓
Resource Map (build-time)
         ↓
{ deployment: {...}, service: {...} }
```

### Defining a Template

```typescript
import { defineStackTemplate } from '@kubricate/core';
import { Deployment, Service } from 'kubernetes-models/v1';
import { kubeModel } from '@kubricate/kubernetes-models';

export const webAppTemplate = defineStackTemplate('WebApp', (input: {
  name: string;
  image: string;
  port?: number;
  replicas?: number;
}) => {
  const port = input.port ?? 80;
  const replicas = input.replicas ?? 1;

  return {
    deployment: kubeModel(Deployment, {
      metadata: { name: input.name },
      spec: {
        replicas,
        selector: { matchLabels: { app: input.name } },
        template: {
          metadata: { labels: { app: input.name } },
          spec: {
            containers: [{
              name: 'app',
              image: input.image,
              ports: [{ containerPort: port }],
            }],
          },
        },
      },
    }),
    service: kubeModel(Service, {
      metadata: { name: input.name },
      spec: {
        selector: { app: input.name },
        ports: [{ port, targetPort: port }],
      },
    }),
  };
});
```

### Using a Template

```typescript
import { Stack } from 'kubricate';

const frontend = Stack.fromTemplate(webAppTemplate, {
  name: 'frontend',
  image: 'myregistry/frontend:v1.2.3',
  port: 3000,
  replicas: 3,
});

const backend = Stack.fromTemplate(webAppTemplate, {
  name: 'backend',
  image: 'myregistry/backend:v2.0.1',
  port: 8080,
});
```

**Result**: Two stacks with identical structure but different configurations — type-checked at compile time.

---

## Creation Patterns

Kubricate supports two stack creation patterns: templates for reusability and static definitions for simple cases.

### Pattern 1: fromTemplate (Recommended)

**Use When**:
- You need reusability across services
- Multiple teams share infrastructure patterns
- You want compile-time type checking

```typescript
const stack = Stack.fromTemplate(myTemplate, { /* inputs */ });
```

**Benefits**:
- Type-safe inputs (TypeScript validates structure)
- Centralized pattern (update once, apply everywhere)
- Testable in isolation (unit test the template function)

### Pattern 2: fromStatic (Simple Cases)

**Use When**:
- Resource is fixed and unchanging (e.g., Namespace)
- No parameterization needed
- Quick one-off definitions

```typescript
const namespace = Stack.fromStatic('Namespace', {
  ns: {
    apiVersion: 'v1',
    kind: 'Namespace',
    metadata: { name: 'production' },
  },
});
```

**Benefits**:
- Simple and direct
- No template boilerplate
- Good for declarative, static resources

---

## Design Guidelines

Follow these principles to build robust, maintainable stack templates.

### 1. Type-Safe Inputs

Always define explicit input types. Use TypeScript interfaces for complex structures.

**Good**:
```typescript
interface WebAppInput {
  name: string;
  image: string;
  port?: number;
  replicas?: number;
  env?: Array<{ name: string; value: string }>;
}

defineStackTemplate('WebApp', (input: WebAppInput) => { /* ... */ });
```

**Bad**:
```typescript
defineStackTemplate('WebApp', (input: any) => { /* ... */ });
// ✗ No type safety, breaks at runtime
```

### 2. Shared Metadata

Use consistent labels and selectors across resources in the same stack.

**Good**:
```typescript
const labels = { app: input.name, tier: 'frontend' };

return {
  deployment: kubeModel(Deployment, {
    metadata: { name: input.name, labels },
    spec: {
      selector: { matchLabels: labels },
      template: {
        metadata: { labels },
        /* ... */
      },
    },
  }),
  service: kubeModel(Service, {
    metadata: { name: input.name, labels },
    spec: { selector: labels },
  }),
};
```

**Bad**:
```typescript
// ✗ Mismatched labels cause Service to not route to Pods
deployment: { spec: { template: { metadata: { labels: { app: 'foo' } } } } },
service: { spec: { selector: { app: 'bar' } } },
```

### 3. Sane Defaults

Provide sensible defaults for optional parameters. Document when defaults might need overriding.

**Good**:
```typescript
const port = input.port ?? 80;          // Standard HTTP
const replicas = input.replicas ?? 1;   // Safe default
const resources = input.resources ?? {
  requests: { cpu: '100m', memory: '128Mi' },
  limits: { cpu: '200m', memory: '256Mi' },
};
```

**Bad**:
```typescript
// ✗ No defaults; forces users to specify everything
const port = input.port;
const replicas = input.replicas;
```

### 4. Validation Checklist

Ensure templates validate required fields and catch errors early.

**Required Fields**:
- ✓ `metadata.name` on all resources
- ✓ `spec.selector` matches Pod labels
- ✓ Container images are parameterized (not hardcoded)
- ✓ Ports are consistent (containerPort = targetPort)

**Example Validation**:
```typescript
if (!input.name) {
  throw new Error('WebApp template requires "name" input');
}

if (!input.image) {
  throw new Error('WebApp template requires "image" input');
}
```

---

## Good vs Bad Examples

### Good Example: Parameterized and Consistent

```typescript
export const cronJobTemplate = defineStackTemplate('CronJob', (input: {
  name: string;
  schedule: string;
  image: string;
  command: string[];
}) => {
  return {
    cronJob: kubeModel(CronJob, {
      metadata: { name: input.name },
      spec: {
        schedule: input.schedule,
        jobTemplate: {
          spec: {
            template: {
              spec: {
                containers: [{
                  name: input.name,
                  image: input.image,
                  command: input.command,
                }],
                restartPolicy: 'OnFailure',
              },
            },
          },
        },
      },
    }),
  };
});
```

**Why Good**:
- Clear input type
- All required fields parameterized
- Sensible default (restartPolicy)
- Single responsibility

### Bad Example: Hardcoded and Unsafe

```typescript
// ✗ Don't do this
export const badTemplate = defineStackTemplate('Bad', (input: any) => {
  return {
    deployment: {
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      metadata: { name: 'hardcoded-name' },  // ✗ Not parameterized
      spec: {
        replicas: 1,  // ✗ No default override
        selector: { matchLabels: { app: 'foo' } },
        template: {
          metadata: { labels: { app: 'bar' } },  // ✗ Mismatch
          spec: {
            containers: [{
              name: 'app',
              image: 'nginx:latest',  // ✗ Hardcoded, not from input
            }],
          },
        },
      },
    },
  };
});
```

**Why Bad**:
- No input type (any breaks compile-time safety)
- Hardcoded values (not reusable)
- Label mismatch (Service won't route)
- Not using kubeModel (loses validation)

---

## Cross-Link

**How templates become real resources**: See [Resource Composition](./03-resource-composition.md) to understand how ResourceComposer instantiates classes, applies overrides, and builds the final resource map.

**Secret injection into stacks**: Learn how to wire secrets into stack resources in [Secret Injection at Build-Time](./04-secret-injection-build.md).

**Further Reading**:
- [Generate Overview](./01-generate-overview.md) — Complete generate workflow
- [Architecture Overview](../big-picture/01-architecture-overview.md) — System design principles
- [Testing Guide](../secrets/10-testing-best-practices.md) — Unit testing your templates
