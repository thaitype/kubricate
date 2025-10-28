
# Architecture Overview — Outline (Big → Small)

## 1) What Kubricate Is (Executive Summary)

* Problem → solution → outcomes (1 paragraph).
* Who this page is for.
* Diagram: Why Kubricate (problem → solution → outcomes).

---

## 2) System Map (The Big Picture)

* One high-level block diagram:

  * External Sources (env/Vault/cloud)
  * Plugin Layer (Connectors, Providers, Stack Templates)
  * Orchestration Layer (SecretManager, SecretsOrchestrator, Stack engine)
  * CLI Layer (commands)
  * Outputs (Kubernetes YAML, effects)
* One-line responsibility per block.

---

## 3) End-to-End Flow (Config → Manifests)

* The five steps: **Configure → Validate → Prepare → Merge → Render/Apply**.
* Map each step to the active layer.
* Note: **effects = data**, applied later.
* Diagram: Lifecycle timeline (steps vs actors).

---

## 4) **User Workflows (CLI Recipes) — The Full Picture**

> This is the new section answering “what do users *actually* run, and in what order?”

### A. Local Dev (quick feedback)

1. `kubricate generate` — render manifests to disk (fast iteration).
2. `kubricate secret validate` — confirm all required secrets exist (no cluster writes).
3. `kubricate secret apply` — create/update Secret objects in the cluster.
4. `kubectl apply -f ./manifests` — deploy workloads that consume those secrets.

**Why this order?**

* You can design and diff YAML first (**generate**).
* Validate secrets next to avoid cluster errors (**secret validate**).
* Apply secrets before workloads reference them (**secret apply**).

> Tip: For totally offline work, run 1→2 only.

### B. CI (artifact-first, cluster later)

1. `kubricate secret validate` (fail fast in CI).
2. `kubricate generate` (produce versioned manifests as artifacts).
3. Publish artifacts (attach to PR or push to artifact store).
4. (Optional) `kubricate secret apply` in a **deploy** job/environment only.

### C. GitOps (pull-based deploy)

1. `kubricate secret validate` (pre-flight in CI).
2. `kubricate generate` (commit YAML to a GitOps repo/branch).
3. GitOps controller applies manifests; **secrets are applied by**:

   * either a Kubricate job/pipeline step that runs `secret apply`,
   * or an out-of-band secret operator (if you’ve integrated one).

> Mini decision table

| Goal                          | Must run           | Nice to run  | Where         |
| ----------------------------- | ------------------ | ------------ | ------------- |
| See diffs fast                | `generate`         | –            | Local/CI      |
| Catch missing env early       | `secret validate`  | –            | Local/CI      |
| Make secrets exist in cluster | `secret apply`     | –            | Deploy stage  |
| Deploy workloads              | `kubectl apply -f` | Argo CD/Flux | Deploy/GitOps |

---

## 5) Monorepo at 10,000 ft

* Short tree of top folders with one-line roles.
* Versioning model (fixed vs independent).
* Table: Package → Responsibility → Consumed by.

---

## 6) Runtime Boundaries & Responsibilities

* What runs where (CLI / Orchestration / Plugins / Executors).
* Single-responsibility per layer; no cross-talk.
* Callout: **Effects-first execution** (providers return data; executed later).

---

## 7) Extensibility Points (Without the Details)

* Connectors (new sources).
* Providers (new formats/strategies).
* Stack templates (reusable compositions).
* Mini “Connector × Provider” matrix sketch + links.

---

## 8) Configuration Philosophy

* Single source of truth via `defineConfig`.
* Convention over configuration (defaults, metadata).
* Type-safety (compile-time guardrails).

---

## 9) Operational Model (Team Patterns)

* Local dev (.env + Opaque).
* CI/CD (Vault/KV + typed providers).
* GitOps (commit manifests; drift metadata).

---

## 10) Non-Goals & Trade-offs

* Not a K8s controller; complements Helm/Argo.
* Trade-offs: TS dependency; explicit plugin contracts.

---

## 11) Quality & Safety Guards (High Level)

* Validation layers (config / connector / provider).
* Conflict strategies (autoMerge/overwrite/error).
* Determinism and hashing.

---

## 12) Glossary (Tiny, page-local)

* Connector, Provider, Effect, Stack, Template, Orchestration.

---

## 13) Where to Go Next (Cross-links)

* Secrets Overview
* Lifecycle & CLI
* Connectors / Providers
* Conflicts & Validation
* Examples

---

### Notes

* Keep this page high-level—no deep API or long code.
* One diagram per major section.
* The **User Workflows** section is the anchor for “what to run, in what order,” including your “generate → secret validate → secret apply” sequence.
