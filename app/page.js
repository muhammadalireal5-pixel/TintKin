import { HeroSection } from "./HeroSection";

export const metadata = {
  title: {
    absolute: "TintKin — Your Daily Skin Coach",
  },
  description: "A skin coach that adapts to you: a plan built for your skin, guided daily sessions, a routine that backs off when your skin reacts, and progress you can trust. Start free.",
  alternates: {
    canonical: "https://tintkin.com",
  },
  openGraph: {
    title: "TintKin — Your Daily Skin Coach",
    description: "A skin coach that adapts to you: a plan built for your skin, guided daily sessions, a routine that backs off when your skin reacts, and progress you can trust. Start free.",
    url: "https://tintkin.com",
  },
};

export default function Home() {
  return <HeroSection />;
}
