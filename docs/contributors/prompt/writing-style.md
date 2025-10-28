# 🧭 Writing Style Guide for Kubricate Docs

## 1. **Voice and Tone**

### ✅ Use an *Expert Mentor* voice

* Friendly, calm, and confident — **not corporate, not chatty**.
* Assume the reader is smart but short on time.
* Always show intent: *why something exists* before *how to use it.*

**Example**

> ❌ “You must register a connector before calling `get()`.”
> ✅ “Register a connector first — this lets the manager know where to fetch values before you call `get()`.”

---

## 2. **Structure per Page**

Follow this consistent rhythm:

1. **Concept summary** — one short paragraph of *why it matters*.
2. **Diagram or schema** — helps the reader form a mental map.
3. **Short code block** — demonstrate key behavior.
4. **Explanation** — 2–3 bullets of how it works.
5. **Checklist or table** — summarize rules or comparisons.
6. **Next steps** — tell the reader what to read next.

**Why:** Developers scan first, then read deeply only if they’re stuck.

---

## 3. **Sentence Style**

| Principle                        | Example                                                                     |
| -------------------------------- | --------------------------------------------------------------------------- |
| Use **present tense**            | “Kubricate generates…” not “Kubricate will generate…”                       |
| Prefer **active voice**          | “The provider formats secrets” not “Secrets are formatted by the provider.” |
| Keep sentences short (≤20 words) | Split long explanations into two.                                           |
| Use parallel structure           | Each list item should start with the same part of speech (e.g., verb).      |
| Avoid filler words               | Drop “basically,” “actually,” “kind of,” etc.                               |

---

## 4. **Code and Commentary**

* Always **show, then tell** — example first, explanation after.
* Keep code blocks short (<15 lines) with only one focus.
* If needed, highlight key lines with inline comments.

**Example**

```ts
const manager = new SecretManager()
  .addConnector('env', new EnvConnector())    // Load from .env
  .addProvider('opaque', new OpaqueSecretProvider()) // Format as K8s Secret
  .addSecret({ name: 'DB_PASSWORD' });
```

Then explain:

> This minimal setup loads `DB_PASSWORD` from your environment and emits a Kubernetes Secret manifest.

---

## 5. **Formatting Conventions**

| Element                     | Rule                                              |
| --------------------------- | ------------------------------------------------- |
| **Headings**                | Use Title Case (e.g., “Secret Lifecycle”)         |
| **Emphasis**                | Use bold for key terms, italics for notes         |
| **Tables**                  | Prefer for comparisons and configuration options  |
| **Notes / Tips / Warnings** | Use emoji or callout style consistently           |
| **File paths / Commands**   | Wrap in backticks: `/packages/plugin-kubernetes/` |
| **Cross-links**             | Always relative: `[Next →](./providers.md)`       |

---

## 6. **Narrative Flow**

Think of the doc as a **story arc**:

> “What is this?” → “Why does it exist?” → “How does it work?” → “How can I extend it?”

Each page should open with a one-sentence “hook”:

> “Secret management in Kubernetes often feels fragile. Kubricate makes it declarative and type-safe.”

…and close with a bridge:

> “Next, let’s look at how these secrets become part of your Pods through injection strategies.”

---

## 7. **Terminology Consistency**

| Concept             | Always use                           | Never use                          |
| ------------------- | ------------------------------------ | ---------------------------------- |
| SecretManager       | “SecretManager”                      | “Manager” alone (too vague)        |
| SecretsOrchestrator | “Orchestrator” (after first mention) | “Engine” (ambiguous)               |
| Provider            | “Provider”                           | “Formatter”                        |
| Connector           | “Connector”                          | “Loader” (unless context-specific) |
| Effect              | “PreparedEffect” (first) → “effect”  | “Action”                           |
| Secret value        | “secret value”                       | “payload” or “datum”               |

Keep a **mini glossary** near the start of the series.

---

## 8. **Level of Detail by Audience**

| Audience          | Detail Level                              | Focus                                           |
| ----------------- | ----------------------------------------- | ----------------------------------------------- |
| App Developers    | High-level concept, ready-to-use examples | “How do I add a secret safely?”                 |
| Integrators       | Config, lifecycle, validation, injection  | “How do I wire Vault or AWS?”                   |
| Core Contributors | Type-safety, orchestration internals      | “How does merging and conflict detection work?” |

Each page should make its audience clear in the first paragraph.

---

## 9. **Length & Pacing**

* 700–1,200 words per page.
* 1 diagram per major section.
* 1 example per concept (don’t duplicate).
* Break paragraphs every 3–4 lines.
* Keep vertical whitespace; let eyes rest.

---

## 10. **Tone Examples**

| Situation   | Example phrasing                                                                                          |
| ----------- | --------------------------------------------------------------------------------------------------------- |
| Explaining  | “This step ensures all declared secrets exist before rendering manifests.”                                |
| Warning     | “If two providers define the same resource name, Kubricate raises a cross-provider conflict.”             |
| Encouraging | “You can safely extend this pattern to custom providers — Kubricate enforces type safety automatically.”  |
| Linking     | “Next, learn how these prepared secrets merge during deployment → [Conflicts & Merging](./conflicts.md).” |

---

## 11. **Do / Don’t Quick Table**

| ✅ Do                                   | ❌ Don’t                         |
| -------------------------------------- | ------------------------------- |
| Lead each page with a *why*            | Start mid-detail                |
| Use one consistent terminology         | Alternate between synonyms      |
| Include one example per concept        | Repeat similar code blocks      |
| Write for skimming first, depth second | Dump long paragraphs            |
| Focus on developer trust               | Over-market or hype             |
| Use neutral emoji (💡⚠️🧠)             | Use decorative or random emojis |

---

## 12. **Stylistic Models**

You can borrow tone and rhythm from:

* **TypeScript Docs** — concise, technical, example-first
* **Kubernetes Concepts Pages** — top-down clarity
* **Stripe Developer Docs** — active, confident language
* **React.dev** — incremental learning flow

Kubricate’s style should feel like:

> “TypeScript precision + Kubernetes clarity + DX empathy.”

