import { HeroSection } from "./HeroSection";

export const metadata = {
  title: {
    absolute: "TintKin — Improve Your Skin in 30 Days",
  },
  description: "Take one selfie and get a personal 30-day skin plan: a simple daily routine, weekly check-ins and visible progress. Start free.",
  alternates: {
    canonical: "https://tintkin.com",
  },
  openGraph: {
    title: "TintKin — Improve Your Skin in 30 Days",
    description: "Take one selfie and get a personal 30-day skin plan: a simple daily routine, weekly check-ins and visible progress. Start free.",
    url: "https://tintkin.com",
  },
};

export default function Home() {
  return <HeroSection />;
}
