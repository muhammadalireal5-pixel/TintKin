export const metadata = {
  title: "What-If Simulator",
  description: "Simulate different skincare routines and habits to see how they impact your skin over time.",
  robots: {
    index: false,
    follow: false,
  },
};

// runWhatIfSim calls YouCam/Qwen sequentially and can run longer than
// Vercel's default 10s function timeout; without this, a slow provider
// response gets killed mid-request and the quota-slot release in the catch
// block never runs.
export const maxDuration = 60;

export default function WhatIfLayout({ children }) {
  return <>{children}</>;
}
