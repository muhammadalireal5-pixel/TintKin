export const metadata = {
  title: "Your Dashboard",
  description: "View your AI-powered skincare journal, historical progress, and personalized recommendations.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function DashboardLayout({ children }) {
  return <>{children}</>;
}
