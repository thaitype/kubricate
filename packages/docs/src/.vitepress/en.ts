import { defineConfig } from "vitepress";
import { baseSidebar } from "./shared";

export const enSidebar = baseSidebar.clone().toSidebarItems();

// https://vitepress.dev/reference/site-config
export const en = defineConfig({
  lang: "en-US",
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: "Guide", link: "/intro" },
      { text: "References", link: "/ref" },
    ],

    sidebar: enSidebar,

    footer: {
      message:
        'Content License under <a href="https://creativecommons.org/licenses/by-nc-nd/4.0/" target="blank">CC BY-NC-ND 4.0</a>',
      copyright: `Copyright © 2025-${new Date().getFullYear()} Thada Wangthammang`,
    },

    editLink: {
      pattern: "https://github.com/thaitype/kubricate/tree/main/packages/docs/:path",
    },
  },
});
