export default function manifest() {
  return {
    name: "TintKin — AI Skin Analysis & Wellness Journal",
    short_name: "TintKin",
    description: "Understand your skin's true potential. Upload a selfie and get instant AI-powered skin analysis, what-if simulations, and personalized insights.",
    start_url: "/",
    display: "standalone",
    background_color: "#FDFBF7",
    theme_color: "#2C3E50",
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
