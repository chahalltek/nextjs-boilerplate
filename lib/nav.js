// lib/nav.ts

export type NavItem = { title: string; href: string; desc?: string };
export type NavGroup = { key: string; label: string; items: NavItem[] };

/**
 * Central place to manage top-nav content.
 * Add/remove items here without touching the Header.
 */
export const navGroups: NavGroup[] = [
  {
    key: "podcast",
    label: "Podcast",
    items: [
      { title: "Episodes", href: "/episodes", desc: "Listen & show notes" },
      { title: "Starter Pack", href: "/starter-pack", desc: "Bite-size intros" },
      { title: "About", href: "/about" },
      { title: "Contact", href: "/contact" },
      { title: "Sponsorships", href: "/sponsorships" },
    ],
  },
  {
    key: "community",
    label: "Community",
    items: [
      { title: "Blog", href: "/blog" },
      { title: "Recaps (CWS)", href: "/cws" },
      { title: "Blog RSS", href: "/blog/rss" },
      { title: "CWS RSS", href: "/cws/rss" },
    ],
  },
  {
    key: "tools",
    label: "Tools",
    items: [
      { title: "Start/Sit", href: "/start-sit" },
      { title: "Holdem Foldem", href: "/holdem-foldem" },
      { title: "Stats", href: "/stats" },
      { title: "Roster", href: "/roster" },
    ],
  },
  // Keep admin links if you want them visible; otherwise delete this group
  {
    key: "admin",
    label: "Admin",
    items: [
      { title: "Dashboard", href: "/admin" },
      { title: "Blog Admin", href: "/admin/posts" },
      { title: "Recap Admin", href: "/admin/recaps" },
      { title: "Polls Admin", href: "/admin/polls" },
      { title: "Start/Sit Admin", href: "/admin/start-sit" },
      { title: "Holdem Foldem Admin", href: "/admin/holdem-foldem" },
    ],
  },
];
