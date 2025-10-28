# Generate Workflow Overview

The `generate` command transforms typed configuration into Kubernetes YAML. It's pure, reproducible, and writes no cluster state — making it perfect for GitOps, CI/CD, and local development workflows.

**Who this is for**: Users and contributors who want to understand what happens when they run `kubricate generate`.

**You'll learn**: How Kubricate turns config into YAML, where each stage runs, and how it fits into the broader CLI lifecycle.

**Prerequisites**: Familiarity with Kubernetes manifests and basic TypeScript.

---

## What `generate` Does

The generate command transforms your infrastructure definition through a series of pure transformations:

1. **Loads Configuration** — Reads `kubricate.config.ts` and validates structure
2. **Builds Stacks** — Converts templates + inputs into resource trees
3. **Injects Secrets** — Merges secret references into resources (no values yet)
4. **Adds Metadata** — Labels, annotations, and hashes for traceability
5. **Renders YAML** — Converts objects to Kubernetes manifests
6. **Writes Output** — Files organized by output mode

**Key Characteristic**: The entire pipeline is pure and reproducible. Running generate twice with the same config produces identical output (same hashes, same structure).

**What It Doesn't Do**:
- No cluster writes (use `kubectl apply` or `secret apply` for that)
- No secret value loading (only references)
- No runtime validation (that happens at apply time)

---

## Pipeline at a Glance

```mermaid
graph LR
    A[Configure] --> B[Build]
    B --> C[Inject]
    C --> D[Metadata]
    D --> E[Render]
    E --> F[Output]

    style A fill:#e3f2fd
    style B fill:#e3f2fd
    style C fill:#e3f2fd
    style D fill:#e3f2fd
    style E fill:#f3e5f5
    style F fill:#212121,color:#fff
```

**Legend**:
- 🟦 Blue — Orchestration (pure logic)
- 🟪 Purple — Plugin (pure logic)
- ⬛ Black — Execution (side effects: file I/O)

### Pipeline Stages

| Stage | Component | Responsibility | Input | Output |
|-------|-----------|---------------|-------|--------|
| **Configure** | ConfigLoader | Load and validate config | `kubricate.config.ts` | KubricateConfig object |
| **Build** | Stack + ResourceComposer | Instantiate resources | Stack templates + inputs | Resource maps |
| **Inject** | BaseStack | Merge secret references | Injection plans | Updated resource maps |
| **Metadata** | MetadataInjector | Add labels/annotations | Resources | Resources + metadata |
| **Render** | Renderer | Convert to YAML | Resources | YAML strings |
| **Output** | GenerateRunner | Write files | YAML strings + mode | Files on disk |

---

## Where It Fits in the CLI Lifecycle

The generate command is typically the first step in your deployment workflow:

```
generate → secret validate → secret apply → kubectl/ArgoCD/Flux
```

### Workflow Context

| Goal | Command | Environment | When |
|------|---------|-------------|------|
| Preview changes | `generate` | Local/CI | Before committing |
| Validate secrets exist | `secret validate` | Local/CI | After config changes |
| Create Secret resources | `secret apply` | Deploy stage | Before workloads |
| Deploy workloads | `kubectl apply -f` | Deploy/GitOps | After secrets exist |

**Common Patterns**:

**Local Development**:
```bash
kubricate generate
git diff output/    # Review changes
kubricate secret validate
kubectl apply -f output/
```

**CI Pipeline**:
```bash
kubricate secret validate  # Fail fast
kubricate generate        # Create artifacts
git add output/ && git commit -m "Update manifests"
```

**GitOps**:
```bash
kubricate generate
git push origin main
# ArgoCD/Flux watches repository and syncs
```

---

## Execution Path

Here's the detailed flow from CLI invocation to file output:

```
User runs:
kubricate generate --outDir manifests

    ↓
┌───────────────────────────────────────────────────────┐
│ CLI Layer                                             │
│ bin.mjs → cli.ts → entrypoint.ts                     │
│ • Parse arguments via yargs                           │
│ • Inject logger based on --verbose/--silent           │
│ • Route to generate command                           │
└───────────────────────┬───────────────────────────────┘
                        ↓
┌───────────────────────────────────────────────────────┐
│ ConfigLoader                                          │
│ • Load kubricate.config.ts via unconfig              │
│ • Validate stack IDs (alphanumeric + - _)            │
│ • Inject logger into all stacks and managers         │
│ • Return KubricateConfig                             │
└───────────────────────┬───────────────────────────────┘
                        ↓
┌───────────────────────────────────────────────────────┐
│ GenerateCommand                                       │
│ • Resolve generate options (merge config + defaults) │
│ • Call Renderer to build and render all stacks       │
│ • Display stack tree to user                         │
│ • Create GenerateRunner with rendered files          │
│ • Execute runner                                     │
└───────────────────────┬───────────────────────────────┘
                        ↓
┌───────────────────────────────────────────────────────┐
│ Renderer                                              │
│ For each stack:                                       │
│   • Call stack.build()                               │
│     └─▶ BaseStack orchestrates:                     │
│         • Group secret injections                    │
│         • Generate provider payloads                 │
│         • Inject into ResourceComposer               │
│         • Build final resources                      │
│   • Inject metadata (MetadataInjector)              │
│   • Convert to YAML strings                          │
│ • Return RenderedResource[]                          │
└───────────────────────┬───────────────────────────────┘
                        ↓
┌───────────────────────────────────────────────────────┐
│ GenerateRunner                                        │
│ • Clean output directory (if enabled)                │
│ • Group files by output mode:                        │
│   - flat: all in stacks.yml                         │
│   - stack: one file per stack                       │
│   - resource: one file per resource                 │
│ • Write files to disk                                │
│ • Display summary                                    │
└───────────────────────────────────────────────────────┘
                        ↓
                   output/*.yml
```

---

## Failure Points (Fast-Fail Model)

Kubricate validates early and fails fast. Here are the checkpoints and what can go wrong:

### 1. Config Load

**What Happens**: ConfigLoader searches for `kubricate.config.{ts,js,mjs,cjs,cts,mts}`

**Failures**:
- File not found in root directory
- Invalid TypeScript/JavaScript syntax
- Stack IDs contain invalid characters (only alphanumeric, `-`, `_` allowed)
- Stack IDs exceed 63 characters

**Example Error**:
```
No config file found matching 'kubricate.config.{ts,js,mjs,cjs,cts,mts}'
Please ensure a config file exists in the root directory: /path/to/project
```

### 2. Stack Build

**What Happens**: Stack executes builder function and instantiates resources

**Failures**:
- Template function throws error
- Required resource properties missing
- Invalid Kubernetes resource structure
- Resource ID collision (duplicate keys in resource map)

**Example Error**:
```
Error building stack "myApp": Missing required field "metadata.name"
```

### 3. Injection Grouping

**What Happens**: BaseStack groups secret injections by provider + resource + path

**Failures**:
- Resource ID not found in composer
- Provider doesn't support specified strategy
- Conflicting values at same path (non-array, non-object)
- Missing injection strategy when provider supports multiple

**Example Error**:
```
Cannot inject, resource "deployment" already has a value at path "spec.template.spec.containers[0].env"
```

### 4. YAML Render

**What Happens**: Renderer converts resources to YAML strings

**Failures**:
- Resource not serializable (circular references)
- Invalid metadata structure
- YAML stringify fails (rare)

**Example Error**:
```
Warning: Resource is not an object, skipping metadata injection
```

### 5. File Write

**What Happens**: GenerateRunner writes YAML to disk

**Failures**:
- Output directory not writable
- Disk full
- Permission denied

**Example Error**:
```
EACCES: permission denied, mkdir '/path/to/output'
```

---

## Next Steps

Now that you understand the generate workflow at a high level, explore the details:

**Understand Components**:
- [Stacks & Templates](./02-stacks-and-templates.md) — Defining reusable infrastructure patterns
- [Resource Composition](./03-resource-composition.md) — How resources are composed and overridden

**Explore Secret Handling**:
- [Secret Injection at Build-Time](./04-secret-injection-build.md) — How secrets wire into stacks during generation

**Learn About Output**:
- [Metadata & Determinism](./05-metadata-and-determinism.md) — Traceability and drift detection
- [YAML Rendering & Output Modes](./06-rendering-and-output.md) — File organization strategies

**Further Reading**:
- [Architecture Overview](../big-picture/01-architecture-overview.md) — System layers and design
- [Secrets Deep Dive](../secrets/00-vision-overview.md) — Complete secret management guide
- [Testing Guide](../secrets/10-testing-best-practices.md) — Testing your infrastructure code
