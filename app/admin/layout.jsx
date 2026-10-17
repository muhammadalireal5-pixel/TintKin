export const metadata = {
  title: "TintKin Admin",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }) {
  return (
    <>
      <style>{`
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
