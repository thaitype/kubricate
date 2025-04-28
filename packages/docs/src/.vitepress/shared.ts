import { defineConfig, type HeadConfig } from "vitepress";
import { transformerTwoslash } from "@shikijs/vitepress-twoslash";
import { Sidebar } from "@thaitype/vitepress-typed-navbar";

export const shared = defineConfig({
  lastUpdated: true,
  title: "Kubricate",
  description: "A TypeScript framework for building reusable, type-safe Kubernetes infrastructure — without the YAML mess.",
  markdown: {
    codeTransformers: [transformerTwoslash()],
  },

  themeConfig: {
    socialLinks: [
      {
        icon: "github",
        link: "https://github.com/thaitype/kubricate",
      },
    ],
    search: {
      provider: "local",
    },
  },

  head: [...googleFonts(), ...googleAnalytics("")],
});

/**
 * Add Google Analytics
 * @ref https://vitepress.dev/reference/site-config#example-using-google-analytics
 * @param tagManagerId
 * @returns
 */
function googleAnalytics(tagManagerId: string): HeadConfig[] {
  return [
    ["script", { async: "", src: `https://www.googletagmanager.com/gtag/js?id=${tagManagerId}` }],
    [
      "script",
      {},
      `window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${tagManagerId}');`,
    ],
  ];
}

function googleFonts(): HeadConfig[] {
  return [
    ["link", { rel: "preconnect", href: "https://fonts.googleapis.com" }],
    ["link", { rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: "" }],
    [
      "link",
      { href: "https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@100..900&display=swap", rel: "stylesheet" },
    ],
  ];
}

export const baseSidebar = new Sidebar({
  collapsed: true,
  extraMessage: "🚧",
})
  /**
   * Start Reading Section
   */
  .addGroup("/", { text: "Introduction" })
  .add("/", "overview", { text: "Overview", link: "/overview" })
  .add("/", "why-kubricate", { text: "Why Kubricate", link: "/why-kubricate" })
  .add("/", "getting-started", { text: "Getting Started", link: "/getting-started" })
  /**
   * Design Guideline Section
   */
  .addGroup("/design-guideline", { text: "Design Guideline" })
  .add("/design-guideline", "design-guideline", {
    text: "Intro",
    link: "/design-guideline",
    docFooterText: "Intro to Design Guideline",
  })
  .add("/design-guideline", "when-type-safe", { text: "When Type-safe", link: "/when-type-safe" })
  .add("/design-guideline", "type-safe-level", { text: "Type-Safe Level", link: "/type-safe-level" })
  .add("/design-guideline", "project-structure", { text: "Project Structure", link: "/project-structure" })
  .add('/design-guideline', 'you-might-not-need-type-safe', { text: "You Might Not Need Type-safe", link: "/you-might-not-need-type-safe" })
  /**
   * Basic Types Section
   */
  .addGroup("/basic-types", { text: "Basic Types" })
  .add("/basic-types", "basic-types", {
    text: "Intro",
    link: "/basic-types",
    docFooterText: "Intro to Basic Types",
  })
  .add("/basic-types", "literal-types", { text: "Literal Types", link: "/literal-types" })
  .add("/basic-types", "template-literal-types", {
    text: "Template Literal Types",
    link: "/template-literal-types",
  })
  .add("/basic-types", "tuple", { text: "Tuple Types", link: "/tuple" })
  .add("/basic-types", "record-object", { text: "Record Types", link: "/record-object" })
  .add("/basic-types", "generics", { text: "Generics", link: "/generics" })
  /**
   * Type Programming Section
   */
  .addGroup("/type-programming", { text: "Type Programming" })
  .add("/type-programming", "type-programming", {
    text: "Intro",
    link: "/type-programming",
    docFooterText: "Intro to Type Programming",
  })
  .add("/type-programming", "conditional-types", { text: "Conditional Types", link: "/conditional-types" })

  .addGroup("/type-programming/loop", { text: "Loop" })
  .add("/type-programming/loop", "mapped-types", { text: "Mapped Types", link: "/mapped-types" })
  .add("/type-programming/loop", "recursive-types", { text: "Recursive Types", link: "/recursive-types" })
  .add("/type-programming", "testing", { text: "Testing", link: "/testing" })
  .add("/type-programming", "examples", { text: "Examples", link: "/examples" })
  /**
   * Design Patterns Section
   */
  .addGroup("/design-patterns", { text: "Design Patterns" })
  .add("/design-patterns", "design-patterns", {
    text: "Intro",
    link: "/design-patterns",
    docFooterText: "Intro to Design Patterns",
  })
  .add("/design-patterns", "loosen-and-tighten", { text: "Loosen and Tighten", link: "/loosen-and-tighten" })
  .add("/design-patterns", "builder-pattern", { text: "Builder Pattern", link: "/builder-pattern" })
  .add("/design-patterns", "function-overload", { text: "Function Overloading", link: "/function-overload" })
  .add("/design-patterns", "function-argument", { text: "Function Argument", link: "/function-argument" })
  .add("/design-patterns", "adapter-pattern", {text: "Adapter Pattern", link: "/adapter-pattern"})
  /**
   * Framework Patterns Section
   */
  .addGroup("/framework-pattern", { text: "Framework Patterns" })
  .add("/framework-pattern", "framework-pattern", {
    text: "Intro",
    link: "/framework-pattern",
    docFooterText: "Intro to Framework Pattern",
  })
  .add("/framework-pattern", "config-file", { text: "Config File", link: "/config-file" })
  .add("/framework-pattern", "generate-dynamic-types", {
    text: "Generate Dynamic Types",
    link: "/generate-dynamic-types",
  })
  /**
   * Performance Section
   */
  .addGroup("/performance", { text: "Performance" })
  .add("/performance", "performance", {
    text: "Intro",
    link: "/performance",
    docFooterText: "Intro to Performance",
  });
