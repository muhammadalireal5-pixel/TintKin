export const metadata = {
  title: "Skin Check-in",
  description: "Take a quick selfie to set your starting point or check your progress against your 30-day skin plan.",
  alternates: {
    canonical: "/capture",
  },
};

// The analyze-and-save server action calls out to YouCam/Qwen, which can run
// longer than Vercel's default 10s function timeout; without this, a slow
// provider response gets killed mid-request and the catch block (which
// releases the reserved quota slot and cleans up the upload) never runs.
export const maxDuration = 120;

export default function CaptureLayout({ children }) {
  return <>{children}</>;
}
