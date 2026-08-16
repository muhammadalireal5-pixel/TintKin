export default function robots() {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/what-if", "/history", "/onboarding", "/admin"],
    },
    sitemap: "https://tintkin.com/sitemap.xml",
  };
}
