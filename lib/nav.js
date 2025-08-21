// lib/nav.js
export const NAV = [
  { label: "Blog", href: "/blog" },
  {
    label: "Learn",
    items: [
      { label: "Fantasy 101", href: "/101" },
      { label: "Draft Like a Queen", href: "/blog/draft-like-a-queen" },
      { label: "Waiver Wire", href: "/blog/waiver-wire-wednesday" },
    ],
  },
  {
    label: "Games",
    items: [
      { label: "Survivor", href: "/survivor" },
      { label: "Weekly Recap (CWS)", href: "/cws" },
    ],
  },
  {
    label: "Community",
    items: [
      { label: "Refer a Friend", href: "/refer" },
      { label: "Threads", href: "/threads" }, // keep or remove if not used
    ],
  },
];

export const CTA = {
  label: "Get Starter Pack",
  href: "/starter-pack.pdf", // or "/starter-pack" if you want a page
};
