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
  .add("/api", "core", { text: "@kubricate/core", link: "/core" })
  .toSidebarItems()