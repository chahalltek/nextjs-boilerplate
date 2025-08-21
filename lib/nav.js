// lib/nav.js

// Grouped navigation data used by <Header />
// Edit safely by keeping the { } and [ ] balanced.
export const navGroups = [
  {
    key: "podcast",
    label: "Podcast",
    items: [
      { title: "Episodes", href: "/episodes", desc: "All podcast episodes" },
      // Example deep links (optional)
      // { title: "Waiver Wire Queens", href: "/episodes/waiver-wire-queens" },
      // { title: "Draft Like a Queen", href: "/episodes/draft-like-a-queen" },
    ],
  },
  {
    key: "tools",
    label: "Tools",
    items: [
      { title: "Roster", href: "/roster" },
      { title: "Stats", href: "/stats" },
      { title: "Start/Sit", href: "/start-sit" },
      { title: "101", href: "/101" },
      { title: "Starter Pack", href: "/starter-pack" },
    ],
  },
  {
    key: "blog",
    label: "Blog",
    items: [
      { title: "All Posts", href: "/blog" }, // or /posts if that's your route
      { title: "Weekly Recaps", href: "/cws" }, // adjust if different
    ],
  },
  {
    key: "more",
    label: "More",
    items: [
      { title: "About", href: "/about" },
      { title: "Refer", href: "/refer" },
      { title: "Sponsorships", href: "/sponsorships" },
      { title: "Contact", href: "/contact" },
      { title: "Privacy", href: "/privacy" },
    ],
  },
];

// Optional: a simple top-level order. The Header can use this to know
// which groups to show as primary tabs (each group becomes a dropdown).
export const topOrder = ["podcast", "vikings", "blog", "more"];

// If your Header expects a flat “quick links” row, export that too:
export const quickLinks = [
  { title: "Home", href: "/" },
];
