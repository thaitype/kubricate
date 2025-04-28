

# 📚 New Kubricate Docs Structure

| Navbar Group                      | Pages                                                                              |
| :-------------------------------- | :--------------------------------------------------------------------------------- |
| **Introduction**                  | Overview, Why Kubricate, Quick Start                                               |
| **Core Concepts**                 | Stacks, Secrets Management, Connectors & Providers, Plugins, Architecture          |
| **Guides & Tutorials**            | Building Stacks, Injecting Secrets, Extending with Plugins, Real-world Examples    |
| **Configuration & Project Setup** | kubricate.config.ts, Metadata & Labels, Output Modes                               |
| **CLI Reference**                 | `generate`, `secrets plan`, `secrets hydrate`, `secrets apply`, CLI Global Options |
| **Advanced Usage**                | Merge Strategies, Cross-Stack Secrets, Helm/Vault Plugins, Metadata Best Practices |
| **Contributing**                  | Developer Guide, Packages Overview, Roadmap & Releases                             |

---

# 📦 Pages inside each Group (final revision)

### **Introduction**
- Overview
- Motivation (Why Kubricate)
- Quick Start

### **Core Concepts**
- Stacks
- Secrets Manager
- Connectors & Providers
- Plugin Providers
- Architecture Overview

### **Guides & Tutorials**
- Build Your First Stack
- Inject Secrets via SecretManager
- Create a Custom Connector
- Add a Plugin Provider
- Real-World Example: Multi-env GitOps
- Real-World Example: Cross-Stack Secrets Sharing

### **Configuration & Project Setup**
- `kubricate.config.ts` Schema
- Metadata & Labels Injection
- Output Modes (stack/resource/flat)

### **CLI Reference**
- `kubricate generate`
- `kubricate secrets plan`
- `kubricate secrets hydrate`
- `kubricate secrets apply`
- CLI Global Options

### **Advanced Usage**
- Secret Merge Strategies (error, overwrite, autoMerge)
- Cross-Stack and Cross-Provider Secret Handling
- Writing Helm/Vault Plugin Providers
- Metadata Label & Annotation Best Practices

### **Contributing**
- Developer Guide (for plugin and package contributors)
- Packages Overview (`@kubricate/core`, `@kubricate/toolkit`, etc.)
- Roadmap
- Release Notes
