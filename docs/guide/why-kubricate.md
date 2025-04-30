---
outline: deep
---

# Why Kubricate

**Why is managing Kubernetes infrastructure still so tedious and error-prone?**
You end up repeating YAML across environments, scattering secrets in different places, and shipping configs with no validation or type checking.

> It’s hard to reuse. Hard to trace. Easy to break.

Kubricate replaces that chaos with reusable, type-safe infrastructure — written in TypeScript and validated at build time.
> No more copy-paste templates. No custom annotations. No runtime surprises.

Imagine managing your entire Kubernetes platform without hand-writing a single line of YAML.
With Kubricate, you declare infrastructure and secrets once — and generate everything from code you trust.
Your single source of truth — across teams, environments, and pipelines.

## The Problem

**YAML wasn’t built for infrastructure. We’re paying for that now.**

What starts as a few clean YAML files quickly sprawls into a forest of fragile templates and hidden assumptions. The more you scale, the harder it gets to reason about what’s really deployed — or why it works (until it doesn’t).

You’ve likely seen this before:

- Secrets duplicated across `.env`, Vault, 1Password, and CI configs  
- Helm values with secret names... but no validation they exist  
- One line in staging breaks prod — because a label didn’t match  
- Vault Agent annotations copied incorrectly — causing secrets to go missing without errors  
- Swapping secret providers means rewriting YAML across multiple repos, with no abstraction

> YAML looks declarative, but acts like implicit logic.  
> It doesn’t drift obviously — it *drifts silently.*

This is **invisible drift** —  
When your infrastructure *looks* the same across environments, but behaves differently because of subtle mismatches: a typo in a mount path, a missing annotation, an outdated secret name. You can’t grep for it. You don’t catch it in code review. You find it after things break.

The root of the problem?  
YAML was never meant for reuse, validation, or evolution. It was designed to declare structure — not to scale change.

Secret management makes this worse.  
Hard-coded annotations. Spread-out config. Backend-specific syntax baked into every file. Changing from Vault to 1Password, or from ExternalSecret to Kubernetes-native `Secret`, shouldn’t require you to rewrite your infrastructure. But it does.

Even with tools like Helm, ESO, or Vault Agent, you're still left stitching things together — hoping you didn’t miss a line.

> What we call “infrastructure as code” often ends up as *infrastructure as copy-paste.*

And that’s not just tedious — it’s dangerous.  
Because if you can’t see your infrastructure clearly,  
you can’t trust it completely.

## The Solution

**Kubricate replaces fragile YAML with reusable, type-safe infrastructure — written in code you trust.**

Instead of writing YAML by hand, or wiring up fragile templates across environments, you define your infrastructure once — in TypeScript.

With Kubricate, you:

- Declare Kubernetes resources as code, with full type safety
- Group them into reusable Stacks like `WebAppStack`, `CronJobStack`, or `IngressGroup`
- Define secrets declaratively, and hydrate them from any provider — Vault, 1Password, dotenv, or Key Vault — without changing your manifests
- Generate all the YAML you need using a CLI — in a way that's testable, visible, and consistent

> No annotation hacks. No brittle Helm templates. No magic sidecars.  
> Just structured infrastructure — designed and validated before deploy time.

Imagine changing your secret backend without touching a single YAML file.  
Or reusing a production-ready deployment setup across 20 services with a single `import`.

Kubricate isn’t a controller.  
It doesn’t run in your cluster.  
It doesn’t add CRDs.

Instead, it gives you a design-time toolchain that integrates into your existing GitOps or CI/CD flow — without forcing a new control plane.

You get one place to define truth. One way to see what’s changing. One consistent process from development to production.

> And you still ship YAML — just not by hand anymore.

## How It Works

**Think of Kubricate as a blueprint system for your entire platform.**

Instead of scattering logic across YAML files, Kubricate organizes your infrastructure into three key layers:

### 1. **Stacks** — Your reusable blueprints

A **Stack** is like a Lego kit.

It bundles together related Kubernetes resources — like a Deployment and a Service — into a single, reusable unit.

You define it once in TypeScript.  
You reuse it with different parameters for every app, every environment.

```ts
new WebAppStack({ name: 'billing-api', image: 'mycorp/billing:prod' });
```

Whether it's a CRON job, a backend service, or a static site — every pattern becomes a shareable, testable module.


### 2. **Secrets** — Declarative, backend-agnostic, CI-ready

Secrets in Kubricate work like environment contracts.

You declare **what** you need — `API_KEY`, `DB_URL` — not *how* to get them.

Then, you configure **where** those secrets should come from (dotenv, 1Password, Vault...) and **where** they should go (Kubernetes Secret, ExternalSecret, etc.).

Changing providers is a one-line config change.  
No YAML rewrites. No annotation rewiring.

> Secrets become infrastructure — not runtime guesswork.

### 3. **CLI** — Your compiler for infrastructure

Kubricate doesn’t run in your cluster.  
It runs *before* you deploy — validating, generating, and syncing all config as part of your CI/CD flow.

- `kubricate generate` → compiles Stacks into clean YAML
- `kubricate secret validate` → checks your secrets exist and match
- `kubricate secret apply` → syncs secrets to your cluster, if needed

You control the outputs, the flow, and the integration.  
No magic controllers. No surprises at runtime.

By separating **definition**, **source of truth**, and **generation**,  
Kubricate helps you scale infrastructure *without scaling entropy.*

> And every piece — from a Deployment to a database password — lives in the open, testable, and typed.

## Key Benefits

**Kubricate brings order, visibility, and trust into your Kubernetes workflow.**

### **1. Type Safety — Bugs caught before deploy**

Every Stack, every secret, every config object is fully typed.  
Miss a required field? Wrong format? You’ll know in your IDE — not at 2am.

> Infrastructure becomes something you can *refactor* — not fear.

### **2. Reuse and Composition — Build once, scale everywhere**

Define patterns once — like a `WebAppStack`, `AuthStack`, or `IngressGroup`.  
Use them across environments and teams, with confidence that behavior stays consistent.

> Copy-paste is replaced with clarity and control.

### **3. Plugin System — Integrate with any backend, your way**

Kubricate’s plugin architecture lets you connect to any secret provider (Vault, 1Password, dotenv, Azure) and output to any format (Secret, ConfigMap, ExternalSecret).

Switching providers doesn’t touch your application logic — just the connector.

> Abstraction without losing power.

### **4. CI/CD Native — No runtime surprises**

Kubricate fits into your GitOps or CI pipeline like any build tool.

You run `kbr generate` to build manifests.  
You validate secrets before rollout.  
You don’t rely on sidecars, injectors, or controllers you can’t trace.

> It’s infrastructure you can *see*, *test*, and *trust* — before it goes live.

### **5. Zero Lock-in — Output is just YAML**

Kubricate doesn’t take over your cluster.  
It doesn’t require a controller.  
It generates plain, valid Kubernetes manifests — nothing more.

> Use it with ArgoCD, Flux, kubectl — or just as a smarter way to write YAML.


Kubricate isn’t trying to be the platform.  
It gives *you* the tools to build yours — cleanly, safely, and with less noise.

## Comparison

### 1. YAML Template Builders — How we write manifests in code

Most infrastructure-as-code tools today fall into two broad styles:

#### **Stateful Builders**  
Tools like [Terraform](https://github.com/hashicorp/terraform), [Pulumi](https://github.com/pulumi/pulumi), or [cdk8s](https://github.com/cdk8s-team/cdk8s) treat infrastructure as a living system — with a state file, construct tree, or engine to track what’s been deployed and how it changes. They offer powerful abstractions, but also introduce complexity:

- You often need to manage lifecycle state explicitly.
- Switching between environments means juggling context or stacks.
- Secrets and configs tend to be tightly bound to the tool's internal engine.

They’re ideal when you want to *control the whole world*.  
But they come with runtime dependencies — and learning curves.

#### **Stateless Builders**  
Tools like [Kosko](https://github.com/tommy351/kosko) take a simpler route: treat Kubernetes as plain YAML generation.  
You write TypeScript. You output manifests. That’s it.

No control plane. No magic. Just predictable builds.

Kosko is lightweight — but it leaves composition and structure up to you.  
You’re responsible for organizing complexity as your platform grows.

**Kubricate** sits in the stateless category — but brings the structure that’s usually missing.

It gives you:
- **Type-safe primitives** to define manifests clearly  
- **Stack-level composition** so you can scale patterns, not just templates  
- **Plugin hooks** to extend behavior, without introducing runtime drift

> Like Kosko, Kubricate runs before deployment.  
> But unlike Kosko, it understands *platform structure* — not just files.

You don’t manage state.  
You don’t run a daemon.  
You don’t explain what changed — you declare what *should be*.

### 2. Grouping Templates — How we reuse structure across environments

Managing one YAML file is easy.  
Managing 30 services across 3 environments? That’s when most teams reach for **Helm**.

#### **Helm**

Helm lets you template values into your YAML — like functions with parameters.  
You write one chart, then inject different values (`values.yaml`) for dev, staging, or prod.

It’s powerful — and familiar to many teams.  
But it introduces complexity when logic grows:

- Templates are untyped — one wrong indent can break everything.
- Logic is hidden in Go templating, hard to validate or refactor.
- Sharing patterns between charts often means copy-paste or deep conventions.

> Helm helps with reuse — but logic often hides inside templates, making visibility harder across teams.

Helm also includes lifecycle tools: `install`, `upgrade`, `rollback`.  
If you use those features, Helm tracks what it installs — as **releases** stored in your cluster.

But Helm can also be used purely for rendering — as a template engine without state or deployment logic.  
Many teams use it this way in GitOps workflows.

> Helm gives you both: templating and deployment.  
> That integration comes with more moving parts — by design.

#### **Kubricate**

Kubricate takes a design-first approach.

You **declare what secrets are needed** — like `addSecret('API_KEY')` — and define **where they come from** and **where they go**.  
This turns secrets into part of the platform’s *structure*, not just its config.

> No scattered annotations. No runtime surprises. Just declarative intent.

Kubricate separates secret ownership into two concepts:

- **Connectors** — describe *where* secrets come from (e.g. dotenv, Vault, 1Password)
- **Providers** — describe *how* those secrets should be delivered (e.g. Kubernetes `Secret`, `ExternalSecret`, or annotations)

This means your application logic stays clean.  
If you want to switch from Vault to 1Password — or from `ExternalSecret` to `Secret` — you don’t rewrite templates.  
You rewire the config.

> With Vault Agent, the injection logic is encoded in annotations — often copied across multiple YAML files.  
> With Kubricate, that logic lives in code — versioned, testable, and abstracted.

Kubricate doesn’t replace your secret backend.  
It replaces the glue, templates, and trial-and-error needed to make those tools work together.

> Design your secrets like code.  
> Render them like infrastructure.  
> Deliver them without guessing.

### 3. Secret Solutions — How we manage sensitive data in Kubernetes

**Secret management in Kubernetes has long been a fragmented challenge.**

Most teams rely on tools like **External Secrets Operator (ESO)**, **Vault Agent**, or **SOPS** to inject, mount, or encrypt secrets across environments.  
Each of these works — but with trade-offs:

---

#### **ESO (External Secrets Operator)**

ESO syncs secrets from backends like AWS Secrets Manager or Vault into Kubernetes using CRDs.  
It’s powerful for automation — but deeply tied to YAML and CRD sprawl.

You manage configuration across multiple files, often repeating annotations or labels.  
Reusing patterns or testing changes becomes harder as the system grows.

---

#### **Vault Agent Injector**

Vault Agent Injector is part of the HashiCorp Vault ecosystem.  
It injects secrets dynamically into running Pods via sidecar containers — without writing them as Kubernetes Secrets.

This avoids persisting secrets in the cluster — but introduces operational complexity:

- Requires per-Pod annotations to configure secret injection  
- Relies on Vault auth policies, roles, and token lifecycles  
- Failures can be silent and difficult to debug during rollout

It’s highly secure — but harder to validate at design time.

---

#### **SOPS / Sealed Secrets**

Tools like SOPS encrypt secrets for Git storage.  
They’re GitOps-friendly, but introduce lifecycle friction:

- Rotation is manual or tool-driven  
- Secrets are versioned, but often detached from application ownership  
- There’s no universal way to trace where secrets go — or who uses them

---

#### **Kubricate**

Kubricate takes a design-first approach.

You **declare what secrets are needed** — like `addSecret('API_KEY')` — and define **where they come from** and **where they go**.  
This turns secrets into part of the platform’s *structure*, not just its config.

> No scattered annotations. No runtime surprises. Just declarative intent.

Kubricate separates secret ownership into two concepts:

- **Connectors** — describe *where* secrets come from (e.g. dotenv, Vault, 1Password)  
- **Providers** — describe *how* those secrets should be delivered (e.g. Kubernetes `Secret`, `ExternalSecret`, or annotations)

This separation means your application logic stays clean.  
If you want to switch from Vault to 1Password — or from `ExternalSecret` to `Secret` — you don’t rewrite templates.  
You rewire the config.

> With Vault Agent, the injection logic is encoded in annotations — often copied across multiple YAML files.  
> With Kubricate, that logic lives in code — versioned, testable, and abstracted.

Kubricate doesn’t replace your secret backend.  
It replaces the glue, templates, and trial-and-error needed to make those tools work together.

> Design your secrets like code.  
> Render them like infrastructure.  
> Deliver them without guessing.

### Conclusion — Choosing structure over sprawl
Kubernetes has tools for templating, syncing, and injecting — but not for organizing.

Kubricate doesn’t replace your secrets, your charts, or your clusters.
It replaces the friction between them — with code, structure, and clarity.