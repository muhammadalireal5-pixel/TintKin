export const metadata = {
  title: "Scan Your Skin",
  description: "Take a selfie to get an instant AI-powered skin analysis. See your overall hydration, wrinkles, firmness, spots, and radiance scores.",
  alternates: {
    canonical: "/capture",
  },
};

// The analyze-and-save server action calls out to YouCam/Qwen, which can run
// longer than Vercel's default 10s function timeout; without this, a slow
// provider response gets killed mid-request and the catch block (which
// releases the reserved quota slot and cleans up the upload) never runs.
export const maxDuration = 60;

export default function CaptureLayout({ children }) {
  return <>{children}</>;
}
