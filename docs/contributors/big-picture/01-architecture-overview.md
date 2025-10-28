# Architecture Overview

Managing Kubernetes infrastructure often feels fragile. Kubricate makes it declarative and type-safe — turning scattered YAML into structured code you can trust.

**Who this is for**: Evaluators, new contributors, and platform leads who want to understand Kubricate at 10,000 feet before diving deeper.

---

## What Kubricate Is

**The Problem**

Kubernetes infrastructure sprawls across YAML files, with secrets scattered between .env files, Vault, cloud providers, and CI configs. One typo breaks prod. Switching secret backends means rewriting templates across repos. Helm values reference secrets with no validation they exist.

**The Solution**

Kubricate replaces fragile YAML with reusable, type-safe infrastructure written in TypeScript. You define resources once, compose them into Stacks, declare secrets abstractly, and generate everything from code validated at build time.

**The Outcome**

Teams get type-checked infrastructure, reusable patterns, backend-agnostic secrets, and CI-native workflows. No runtime controllers. No CRDs. Just clean YAML generated from trusted code.

---

## System Architecture Map

Kubricate's architecture follows a layered design. Each layer has a single responsibility and communicates through well-defined interfaces.

```
┌─────────────────────────────────────────────────────────────┐
│                      External Sources                        │
│  (.env files, Vault, Azure KV, 1Password, Cloud Secrets)   │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                      Plugin Layer                            │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │  Connectors  │  │  Providers   │  │ Stack Templates │  │
│  │ (Load secrets│  │ (Format for  │  │  (Reusable      │  │
│  │  from sources)│  │  K8s/inject) │  │   compositions) │  │
│  └──────────────┘  └──────────────┘  └─────────────────┘  │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                  Orchestration Layer                         │
│  ┌────────────────┐  ┌──────────────────┐  ┌────────────┐ │
│  │ SecretManager  │  │SecretsOrchestrator│ │ Stack Engine│ │
│  │ (Registry for  │  │  (Validation,     │ │(Resource    │ │
│  │  connectors,   │  │   conflict res.,  │ │ composition,│ │
│  │  providers)    │  │   effect merging) │ │ injection)  │ │
│  └────────────────┘  └──────────────────┘  └────────────┘ │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                       CLI Layer                              │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  Commands   │  │ ConfigLoader │  │    Executors     │  │
│  │ (generate,  │  │ (Load & val- │  │ (kubectl, file   │  │
│  │  secret)    │  │  idate conf) │  │  I/O)            │  │
│  └─────────────┘  └──────────────┘  └──────────────────┘  │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                        Outputs                               │
│  ┌──────────────────┐  ┌─────────────────────────────────┐ │
│  │ Kubernetes YAML  │  │  Effects (kubectl apply, etc.)  │ │
│  └──────────────────┘  └─────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**Layer Responsibilities**:

- **External Sources** — Backend systems where secrets live
- **Plugin Layer** — Extensibility points for custom behavior
- **Orchestration Layer** — Core business logic and coordination
- **CLI Layer** — User interface and I/O operations
- **Outputs** — Generated artifacts and applied effects

---

## End-to-End Flow

Kubricate's lifecycle follows five distinct steps. Each step is pure and testable until the final application phase.

```
Configure → Validate → Prepare → Merge → Render/Apply
```

### The Five Steps

**1. Configure** (Plugin Layer)

You define infrastructure in `kubricate.config.ts`:
- Register Connectors (where secrets come from)
- Register Providers (how secrets are formatted)
- Declare Stacks (groups of resources)
- Wire secrets into resources via injection strategies

**2. Validate** (Orchestration Layer)

Kubricate validates the configuration:
- All stacks have valid IDs
- All secrets have assigned connectors and providers
- Secret values can be loaded from connectors
- No duplicate or conflicting registrations

**3. Prepare** (Orchestration Layer)

Pure data structures are generated without side effects:
- Stacks build resource trees via ResourceComposer
- Providers generate effects via prepare method
- Effects describe what will happen (data) not how to do it (side effects)

**4. Merge** (Orchestration Layer)

SecretsOrchestrator resolves conflicts:
- Groups effects by conflict key (provider + identifier)
- Determines conflict level (intraProvider, crossProvider, crossManager)
- Applies strategy (autoMerge, overwrite, error)
- Providers merge secrets via mergeSecrets method

**5. Render/Apply** (CLI Layer)

Side effects execute in controlled environments:
- **Render** — Write YAML files to disk (manifest generation)
- **Apply** — Execute kubectl commands (secret deployment)

### Lifecycle Timeline

```
User/CI          CLI              Orchestrator         Plugin
   │              │                    │                 │
   │──config──────▶                    │                 │
   │              │──load & validate──▶                  │
   │              │                    │──load secrets──▶
   │              │                    │◀────values──────┤
   │              │                    │                 │
   │              │◀──validation ok────┤                 │
   │              │                    │                 │
   │──generate────▶                    │                 │
   │              │──build stacks─────▶                  │
   │              │                    │──prepare────────▶
   │              │                    │◀──effects───────┤
   │              │                    │──merge──────────▶
   │              │◀──resources────────┤                 │
   │◀──YAML───────┤                    │                 │
   │              │                    │                 │
   │──secret apply▶                    │                 │
   │              │──apply effects────▶                  │
   │              │                    │                 │
   │              └──kubectl apply────────────────────────▶
   │                                                     K8s
```

---

## Effects-First Design

**Key Principle**: Preparation returns data, not side effects. This separation enables testing, dry-runs, and auditability.

```typescript
// Prepare (pure)
const effects = provider.prepare('API_KEY', 's3cr3t');
// Returns: [{ type: 'kubectl', value: { kind: 'Secret', ... } }]

// Apply (side effects)
for (const effect of effects) {
  await kubectl.apply(effect.value);
}
```

**Why This Matters**:

- **Testable** — Preparation logic is pure, no mocks needed
- **Dry-Run** — Inspect effects before applying
- **Conflict Detection** — Happens before I/O
- **Audit Trail** — Clear record of what changed

Kubricate separates "what to do" from "how to do it." Providers generate effects describing operations. Executors perform those operations with side effects isolated.

This design makes the entire preparation phase testable without touching filesystems or clusters. You can inspect, validate, and transform effects before committing to any changes.

---

## Where to Next

Ready to see how this architecture works in practice?

**Understand User Workflows**:
- [User Workflows & CLI](./02-user-workflows-cli.md) — What commands to run and in what order

**Explore Secret Management**:
- [Secrets System Overview](./03-secrets-overview.md) — How connectors, providers, and orchestration work together

**Learn About Extension**:
- [Extensibility & Monorepo](./04-extensibility-and-monorepo.md) — How to extend Kubricate and where code lives

**Deep Dive into Secrets**:
- [Secrets Documentation](../secrets/00-vision-overview.md) — Complete secret management guide
