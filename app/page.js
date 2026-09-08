import { HeroSection } from "./HeroSection";

export const metadata = {
  title: {
    absolute: "TintKin — AI Skin Analysis & Wellness Journal",
  },
  description: "Understand your skin's true potential. Upload a selfie and get instant AI-powered skin analysis, what-if simulations, and personalized insights.",
  alternates: {
    canonical: "https://tintkin.com",
  },
  openGraph: {
    title: "TintKin — AI Skin Analysis & Wellness Journal",
    description: "Understand your skin's true potential. Upload a selfie and get instant AI-powered skin analysis, what-if simulations, and personalized insights.",
    url: "https://tintkin.com",
  },
};

export default function Home() {
  return <HeroSection />;
}
