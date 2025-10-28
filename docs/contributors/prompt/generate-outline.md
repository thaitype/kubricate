# 📦 Kubricate Generate Workflow — Revised Outline (6 Pages)

---

## **Page 1 — Generate Workflow Overview**

**Filename:** `01-generate-overview.md`
**Audience:** Users & contributors who want to understand what happens when they run `kubricate generate`.

### Purpose

Explain what “generate” does from end to end — how Kubricate turns typed config into YAML — and where it fits in the CLI lifecycle.

### Sections

1. **What `generate` Does**

   * Transforms config → stack templates → resources → YAML output
   * Pure, reproducible, no cluster writes
2. **Pipeline at a Glance**

   * Configure → Build → Inject → Metadata → Render → Output
   * Diagram: **Generate Pipeline (mermaid)**
   * Each stage → which component runs it
3. **Where It Fits in the CLI Lifecycle**

   * `generate → secret validate → secret apply → kubectl/ArgoCD/Flux`
   * Table: goal vs command vs environment
4. **Execution Path**

   * ConfigLoader → Renderer → Stack → ResourceComposer → MetadataInjector → GenerateRunner
5. **Failure Points (Fast-Fail Model)**

   * Config load
   * Stack build
   * Injection grouping
   * YAML render
6. **Next Steps**

   * Links to **Stacks & Templates** (Page 2) and **Secret Injection** (Page 4)

---

## **Page 2 — Stacks & Templates (Conceptual Model)**

**Filename:** `02-stacks-and-templates.md`
**Audience:** Engineers defining reusable stacks.

### Purpose

Give a mental model for stacks and templates — what they are and why they matter — without implementation noise.

### Sections

1. **What Is a Stack**

   * Cohesive group of Kubernetes resources
   * Created from template or static definition
2. **Template System**

   * `defineStackTemplate(name, create)` → resource map
   * Diagram: **Template → Stack → Resource Map**
3. **Creation Patterns**

   * `fromTemplate()` – reusable patterns
   * `fromStatic()` – fixed resources (e.g., Namespace)
4. **Design Guidelines**

   * Type-safe inputs
   * Shared metadata
   * Defaults and parameterization
   * Validation checklist (required fields, sane defaults)
5. **Good vs Bad Examples** (≤5-line snippets)
6. **Cross-Link**

   * “How templates become real resources → see Resource Composition (Page 3)”

---

## **Page 3 — Resource Composition & Overrides**

**Filename:** `03-resource-composition.md`
**Audience:** Developers extending or debugging stack behavior.

### Purpose

Describe how Kubricate composes resources, handles merges, and applies overrides safely.

### Sections

1. **What ResourceComposer Does**

   * Tracks resource entries, applies overrides, produces final map
   * Entry types: class / object / instance
2. **Merge & Injection Semantics**

   * Undefined → set
   * Array + Array → append
   * Object + Object → deep-merge
   * Anything else → error
3. **Override API**

   * `override()` behavior and constraints
   * Example: override replicas in Deployment
4. **Build Flow**

   * Apply overrides → instantiate → return resource map
   * Diagram: **Composer Flow (entries → build → output)**
5. **Testing Resource Composition**

   * Snapshot resource maps; test merges
   * Example unit test
6. **Cross-Link**

   * “Next: how secrets inject into this build process”

---

## **Page 4 — Secret Injection at Build-Time**

**Filename:** `04-secret-injection-build.md`
**Audience:** Platform engineers wiring secrets into stacks.

### Purpose

Explain how secret injections are resolved during `stack.build()` — and clarify what happens vs. what doesn’t (no cluster writes yet).

### Sections

1. **Concept: Build-Time Injection vs Cluster-Time Secrets**

   * Generate inserts references; `secret apply` materializes real secrets
2. **`useSecrets()` Lifecycle**

   * Register manager → collect injections → group → inject
3. **Grouping Logic**

   * Key = `providerId:resourceId:path`
   * Diagram: **Injection Grouping Flow**
4. **Provider Payload**

   * `getInjectionPayload(injects)` returns data for composer
   * Example: env var array payload
5. **Pitfalls & Safety Checks**

   * Duplicate target names
   * Wrong container index
   * Unsupported strategies
6. **Testing Injection**

   * Build stack → inspect `env` array → assert references
7. **Cross-Link**

   * “Next: metadata & determinism in rendered output”

---

## **Page 5 — Metadata & Determinism**

**Filename:** `05-metadata-and-determinism.md`
**Audience:** Ops & auditors concerned with traceability.

### Purpose

Show how Kubricate makes generated resources identifiable, traceable, and stable across runs.

### Sections

1. **Why Metadata Exists**

   * Labels/annotations for discovery, auditing, drift detection
2. **Injected Fields**

   * Stack ID, resource ID, version, hash, managedAt timestamp
   * Example YAML before/after (2 columns)
3. **Hashing Mechanism**

   * What’s excluded (UID, managedFields, etc.)
   * How sorting & serialization ensure deterministic output
4. **Operational Uses**

   * Drift detection
   * Targeted cleanup (`kubectl -l kubricate=true`)
   * Version traceability
5. **Configuration Knobs**

   * `injectVersion`, `injectResourceHash`, `injectManagedAt`
6. **Cross-Link**

   * “Final step: rendering and output modes”

---

## **Page 6 — YAML Rendering & Output Modes**

**Filename:** `06-rendering-and-output.md`
**Audience:** Anyone producing or structuring generated manifests.

### Purpose

Explain how resources become YAML, how files are organized, and how to tailor output for CI/GitOps.

### Sections

1. **Rendering Pipeline**

   * Renderer → MetadataInjector → YAML.stringify → write files
2. **Output Modes**

   * `stack` (atomic app file)
   * `resource` (per resource)
   * `kind` (per K8s kind)
   * Table: Mode | When to use | Example file names
3. **Filtering**

   * `--filter myApp` / `--filter myApp.deployment` examples
4. **CI/GitOps Tips**

   * Write to `./manifests`
   * Commit artifacts for ArgoCD/Flux
   * Clean output dir option
5. **Troubleshooting**

   * Invalid YAML indentation
   * Missing metadata
   * Hash mismatch warnings
6. **Cross-Links**

   * Back to Architecture Overview
   * Forward to “Command Flows” and “Secrets Deep Dive”

---

## 🔁 **Global Consistency Rules**

* **Opening trio per page:** “Who this is for,” “You’ll learn,” “Prereqs.”
* **One diagram max** per page, consistent legend:

  * 🟦 Orchestration (pure) 🟩 Plugin (pure) ⬛ Execution (side-effect)
* **Snippet discipline:** ≤ 15 lines; must compile standalone.
* **Same “Further Reading” block** on all pages → Architecture Overview · Secrets Deep Dive · Testing Guide.
* **≤ 1 200 words/page** for readability.

---

✅ **Result:**

* Every page now has one clear purpose.
* No redundancy between Stacks/Composition.
* Secret injection clearly separated from runtime secrets.
* Metadata & rendering have distinct, lightweight homes.
* The entire workflow is traceable from a user’s perspective *and* auditable from a platform’s view.
