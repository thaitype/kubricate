import { Sidebar } from "@thaitype/vitepress-typed-navbar";

export const enReference = new Sidebar({
  collapsed: true,
  extraMessage: "🚧",
})
  /**
   * Introduction Section
   */
  .addGroup("/", { text: "Introduction" })
  .add("/", "overview", { text: "Overview", link: "/overview" })

  /**
   * Reference Section
   */
  .addGroup("/api", { text: "API" })
  .add("/api", "index", { text: "All Packages", link: "/", })
  .add("/api", "kubricate", { text: "kubricate", link: "/kubricate" })
  .add("/api", "core", { text: "@kubricate/core", link: "/core" })
  .add("/api", "env", { text: "@kubricate/env", link: "/env" })
  .add("/api", "kubernetes", { text: "@kubricate/kubernetes", link: "/kubernetes" })
  .add("/api", "stacks", { text: "@kubricate/stacks", link: "/stacks" })
  .add("/api", "toolkit", { text: "@kubricate/toolkit", link: "/toolkit" })
  .toSidebarItems()