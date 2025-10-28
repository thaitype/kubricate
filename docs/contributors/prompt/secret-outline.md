# Secret Management — Top-Down Docs Outline

## 1) Vision & Big Picture

**Filename:** `secrets/00-vision-overview.md`
**Goal:** Set context and outcomes before any details.

* Problem & goals (YAML sprawl, unsafe .env, drift)
* What Kubricate guarantees (type-safety, repeatability, pluggability)
* Big picture diagram (one simple LR flow)
* Reader paths (Deployers vs Contributors)

---

## 2) System Architecture (Big Map)

**Filename:** `secrets/01-architecture-big-picture.md`
**Goal:** Show all parts at once.

* Layered diagram (External Sources / Plugin Layer / Orchestration / Kubernetes)
* Responsibilities per layer (1–2 bullets each)
* Where code lives (high-level packages only)
* How this section maps to later pages

---

## 3) End-to-End Lifecycle (From Config to Cluster)

**Filename:** `secrets/02-lifecycle.md`
**Goal:** Tell the story of a secret traveling through the system.

* Lifecycle diagram: Configure → Validate → Prepare → Merge → Execute
* CLI mapping (`validate`, `apply`, `generate`)
* Minimal “hello secret” example (10–15 lines)

---

## 4) Core Building Blocks (Concepts)

**Filename:** `secrets/03-core-concepts.md`
**Goal:** Define the nouns before APIs.

* Connector (read-only loader)
* Provider (K8s-aware formatter)
* SecretManager (type-safe registry)
* SecretsOrchestrator (execution engine)
* Short “when to use what” matrix

---

## 5) Connectors (Drill-Down #1)

**Filename:** `secrets/04-connectors.md`
**Goal:** Deep dive into data loading.

* Contract (table: `load`, `get`, optional workingDir)
* EnvConnector quick example
* Error patterns (missing, unreadable, malformed)
* Mini checklist (Do/Don’t)

---

## 6) Providers (Drill-Down #2)

**Filename:** `secrets/05-providers.md`
**Goal:** Deep dive into output formatting.

* Contract (table: `prepare`, `getInjectionPayload`, `mergeSecrets`)
* Opaque / TLS / Docker config mini-examples
* Effect identifiers & `allowMerge`
* Mini checklist (Do/Don’t)

---

## 7) Injection Strategies (How Secrets Appear in Pods)

**Filename:** `secrets/06-injection-strategies.md`
**Goal:** Practical reference.

* Strategy matrix: `env`, `envFrom`, `volume`, `imagePullSecret`
* Tiny YAML per strategy (diff-style)
* “Choose this when…” cheatsheet

---

## 8) Validation (Guardrails)

**Filename:** `secrets/07-validation.md`
**Goal:** Show where errors are caught and why.

* Levels: Configuration → Connector → Provider
* Strict mode rules
* Top 10 error messages (symptom → cause → fix table)

---

## 9) Conflicts & Merging (When Things Collide)

**Filename:** `secrets/08-conflicts-merging.md`
**Goal:** Make conflict handling predictable.

* Levels: intraProvider / crossProvider / crossManager
* Strategies: `error` / `overwrite` / `autoMerge` (defaults & strict)
* Merge flow diagram
* Two scenarios (merge success, cross-provider error)

---

## 10) Extensibility (Build Your Own)

**Filename:** `secrets/09-extensibility.md`
**Goal:** Teach minimal, stable extension points.

* Custom Connector skeleton (Vault example trimmed)
* Custom Provider skeleton (JWT example trimmed)
* Supported keys & type-safe `supportedEnvKeys`
* When to implement `mergeSecrets` & `getEffectIdentifier`

---

## 11) Testing & Best Practices

**Filename:** `secrets/10-testing-best-practices.md`
**Goal:** Operationalize quality.

* Unit patterns (connectors/providers)
* Integration pattern (env → manager → effects)
* Do/Don’t tables: connector, provider, errors, types
* CI hints (fast tests, mock external services)

---

## 12) API Reference (Generated)

**Filename:** `api/secrets/*`
**Goal:** Keep signatures out of prose.

* Where to find TSDoc / how to regenerate
* Versioning & stability (Changesets / semver)

---

### Navigation sequencing (sidebar order)

1. Vision & Big Picture
2. System Architecture
3. End-to-End Lifecycle
4. Core Building Blocks
5. Connectors
6. Providers
7. Injection Strategies
8. Validation
9. Conflicts & Merging
10. Extensibility
11. Testing & Best Practices
12. API Reference

### Design notes

* One diagram per page (high contrast; readable on dark/light).
* Keep code blocks ≤15 lines; link full samples in `/examples/secrets/*`.
* First occurrence of “Effect”, “Injection”, etc. links to a small **Glossary** box on page 4.
* No internal file paths/line numbers; link packages instead.
* Each page ends with “Next” and “Related” links.

