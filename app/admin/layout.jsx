export const metadata = {
  title: "TintKin Admin",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }) {
  return (
    <>
      {/* Hide the main app header on admin pages */}
      <style>{`
        header.sticky { display: none !important; }
        body.tk-body {
          background: var(--tk-bg) !important;
          color: var(--tk-text-primary) !important;
        }
      `}</style>
      <div
        style={{
          minHeight: "100vh",
          color: "var(--tk-text-primary)",
          fontFamily: "var(--font-body, 'Outfit', system-ui, sans-serif)",
        }}
      >
        {children}
      </div>
    </>
  );
}
