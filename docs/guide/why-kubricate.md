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

