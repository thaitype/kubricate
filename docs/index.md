---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  name: "Kubricate"
  tagline: A TypeScript framework for building reusable, type-safe Kubernetes infrastructure — without the YAML mess.
  image:
    src: https://i.ibb.co/hJTg9vhs/kubricate-logo.png
    alt: Kubricate Logo

  actions:
    - theme: brand
      text: Getting Started
      link: /guide/getting-started
    - theme: alt
      text: Why Kubricate
      link: /guide/why-kubricate

features:
  - title: 📦 Type-safe Kubernetes Manifests
    details: Define resources with fully-typed TypeScript — enabling reuse, composition, and IDE validation.

  - title: 🧱 Stack-Based Architecture
    details: Group related resources into reusable Stacks like Deployment + Service, and easily extend them across environments.

  - title: 🔐 Declarative Secret Management
    details: Declare secrets with addSecret({ name }) and inject them into Kubernetes resources via Providers.

  - title: ♻️ Connectors and Providers
    details: Connect to secret sources and render them into Kubernetes-native resources like Secret and ConfigMap.

  - title: 🚀 CLI-Friendly & GitOps Ready
    details: Generate, and sync your infrastructure with commands like kubricate generate — no in-cluster runtime needed.

  - title: 🧪 First-Class Developer Experience
    details: Get full TypeScript autocomplete, refactoring, type checks, and linting across your entire platform code.

---

