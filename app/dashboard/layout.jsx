export const metadata = {
  title: "Your Dashboard",
  description: "Follow today's steps in your 30-day skin plan and see how your skin is improving.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function DashboardLayout({ children }) {
  return <>{children}</>;
}
