// app/robots.ts
export default function robots() {
  const SITE_URL = process.env.SITE_URL || "https://www.theskolsisters.com";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/api/admin",
          "/api/admin/*",
        ],
      },
    ],
    sitemap: `${SITE_URL.replace(/\/+$/,"")}/sitemap.xml`,
    host: SITE_URL.replace(/\/+$/,""),
  };
}
