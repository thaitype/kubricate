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
  collapsed: false,
  extraMessage: "🚧",
})
  /**
   * Introduction Section
   */
  .addGroup("/", { text: "Introduction" })
  .add("/", "why-kubricate", { text: "Why Kubricate", link: "/why-kubricate" })
  .add("/", "getting-started", { text: "Getting Started", link: "/getting-started" })