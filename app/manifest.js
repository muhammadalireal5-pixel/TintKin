export default function manifest() {
  return {
    name: "TintKin — Improve Your Skin in 30 Days",
    short_name: "TintKin",
    description: "Take one selfie and get a personal 30-day skin plan: a simple daily routine, weekly check-ins and visible progress. Start free.",
    start_url: "/",
    display: "standalone",
    background_color: "#FCF4F2",
    theme_color: "#FDFBF7",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
