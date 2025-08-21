// lib/nav.js

/** @typedef {{ title: string, href: string, desc?: string }} NavItem */
/** @typedef {{ key: string, label: string, items: NavItem[] }} NavGroup */

/** @type {NavGroup[]} */
export const navGroups = [
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
