// lib/nav.js

// Grouped navigation data used by <Header />
// Edit safely by keeping the { } and [ ] balanced.
export const navGroups = [
  
{
    key: "sitstart",
    label: "Sit/Start",
    items: [
      { title: "Start/Sit", href: "/start-sit" }
    ],
  },

 {
    key: "stats",
    label: "Player Projections",
    items: [
      { title: "Stats", href: "/stats" }
    ],
  },

 {
    key: "discuss",
    label: "Discuss",
    items: [
      { title: "Blog Posts", href: "/blog" }, // or /posts if that's your route
      { title: "Weekly Recaps", href: "/cws" }, // adjust if different
    ],
  },

  {
    key: "tools",
    label: "Tools",
    items: [
      { title: "Lineup Lab", href: "/roster" },
      { title: "101", href: "/101" },
      { title: "Starter Pack", href: "/starter-pack" }
    ],
  },
 
  {
    key: "more",
    label: "More",
    items: [
      { title: "Survivor TV", href: "/survivor" },
      { title: "About", href: "/about" },
      { title: "Refer", href: "/refer" },
      { title: "Episodes", href: "/episodes", desc: "All podcast episodes" },
      // { title: "Sponsorships", href: "/sponsorships" },
      { title: "Contact", href: "/contact" },
      { title: "Privacy", href: "/privacy" },
      { title: "Admin", href: "/admin" }
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
