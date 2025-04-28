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
  .add("/api", "core", { text: "@kubricate/core", link: "/core" })
  .add("/api", "env", { text: "@kubricate/env", link: "/env" })
  .toSidebarItems()