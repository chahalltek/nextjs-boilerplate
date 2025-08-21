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
    ],
  },
  {
    key: "community",
    label: "Community",
    items: [
      { title: "Blog", href: "/blog" },
      { title: "Weekly Recap", href: "/cws" },
    ],
  },
  {
    key: "tools",
    label: "Tools",
    items: [
      { title: "Start/Sit", href: "/start-sit" },
      { title: "Holdem Foldem", href: "/holdem-foldem" },
      { title: "Stats", href: "/stats" },
      { title: "Lineup Lab", href: "/roster" },
      { title: "Starter Pack", href: "/starter-pack", desc: "Bite-size intros" },
    ],
  },
  {
    key: "admin",
    label: "Admin",
    items: [
      { title: "Dashboard", href: "/admin" },
    ],
  },
  {
    key: "about",
    label: "About",
    items: [
      { title: "About", href: "/about" },
      { title: "Contact", href: "/contact" },
      { title: "Sponsorships", href: "/sponsorships" },
    ],
];
