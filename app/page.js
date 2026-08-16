import { HeroSection } from "./HeroSection";

export const metadata = {
  title: "TintKin — AI Skin Analysis & Wellness Journal",
  description: "Understand your skin's true potential. Upload a selfie and get instant AI-powered skin analysis, what-if simulations, and personalized insights.",
  alternates: {
    canonical: '/',
  },
};

export default function Home() {
  return <HeroSection />;
}
