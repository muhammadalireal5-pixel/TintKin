export default function robots() {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/dashboard", "/what-if", "/history", "/onboarding", "/admin",
        "/capture", "/routine", "/progress", "/profile", "/share", "/leaderboard",
      ],
    },
    sitemap: "https://tintkin.com/sitemap.xml",
  };
}
