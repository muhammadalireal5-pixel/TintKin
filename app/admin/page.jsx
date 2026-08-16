import { redirect } from "next/navigation";
import { verifyAdminSession } from "@/app/lib/admin-auth";
import { connectDb, User, Selfie, Simulation } from "@/app/lib/mongoose";
import { adminAuth } from "@/app/lib/firebase/admin";
import AdminDashboard from "./AdminDashboard";

export const dynamic = "force-dynamic";

async function fetchAdminData() {
  await connectDb();

  const users = await User.find({}).lean();

  // Fetch Firebase user data
  let firebaseUsersMap = {};
  try {
    let pageToken = undefined;
    let hasMore = true;
    while (hasMore) {
      const listUsersResult = await adminAuth.listUsers(1000, pageToken);
      listUsersResult.users.forEach((u) => {
        firebaseUsersMap[u.uid] = {
          email: u.email || "N/A",
          firstName: u.displayName ? u.displayName.split(" ")[0] : "",
          lastName: u.displayName ? u.displayName.split(" ").slice(1).join(" ") : "",
          imageUrl: u.photoURL || null,
          lastSignInAt: u.metadata.lastSignInTime ? new Date(u.metadata.lastSignInTime).toISOString() : null,
          createdAt: u.metadata.creationTime ? new Date(u.metadata.creationTime).toISOString() : null,
        };
      });
      if (listUsersResult.pageToken) {
        pageToken = listUsersResult.pageToken;
      } else {
        hasMore = false;
      }
    }
  } catch (err) {
    console.error("[Admin] Firebase fetch error:", err);
  }

  const userIds = users.map((u) => u._id);

  const [scanCounts, simCounts, lastScans] = await Promise.all([
    Selfie.aggregate([
      { $match: { userId: { $in: userIds } } },
      { $group: { _id: "$userId", count: { $sum: 1 } } },
    ]),
    Simulation.aggregate([
      { $match: { userId: { $in: userIds } } },
      { $group: { _id: "$userId", count: { $sum: 1 } } },
    ]),
    Selfie.aggregate([
      { $match: { userId: { $in: userIds } } },
      { $sort: { takenAt: -1 } },
      {
        $group: {
          _id: "$userId",
          lastScan: { $first: "$takenAt" },
          latestScore: { $first: "$overallScore" },
          latestSkinAge: { $first: "$skinAge" },
        },
      },
    ]),
  ]);

  const scanMap = {};
  scanCounts.forEach((s) => (scanMap[s._id.toString()] = s.count));
  const simMap = {};
  simCounts.forEach((s) => (simMap[s._id.toString()] = s.count));
  const lastScanMap = {};
  lastScans.forEach((s) => {
    lastScanMap[s._id.toString()] = {
      lastScan: s.lastScan,
      latestScore: s.latestScore,
      latestSkinAge: s.latestSkinAge,
    };
  });

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const enrichedUsers = users.map((u) => {
    const uid = u._id.toString();
    const firebaseData = firebaseUsersMap[u.firebaseUid] || {};
    const scanInfo = lastScanMap[uid] || {};
    const lastScanDate = scanInfo.lastScan ? new Date(scanInfo.lastScan) : null;
    const isActive = lastScanDate && lastScanDate > sevenDaysAgo;

    return {
      _id: uid,
      firebaseUid: u.firebaseUid,
      email: firebaseData.email || u.email || "N/A",
      firstName: firebaseData.firstName || u.displayName?.split(" ")[0] || "",
      lastName: firebaseData.lastName || u.displayName?.split(" ").slice(1).join(" ") || "",
      imageUrl: firebaseData.imageUrl || u.photoURL || null,
      sex: u.sex || "N/A",
      skinType: u.skinType || "N/A",
      goals: u.goals || [],
      customGoal: u.customGoal || "",
      onboardingComplete: u.onboardingComplete || false,
      isSubscribed: u.isSubscribed || false,
      subscribedAt: u.subscribedAt ? new Date(u.subscribedAt).toISOString() : null,
      birthDate: u.birthDate ? new Date(u.birthDate).toISOString() : null,
      scanCount: scanMap[uid] || 0,
      simulationCount: simMap[uid] || 0,
      lastScan: scanInfo.lastScan ? new Date(scanInfo.lastScan).toISOString() : null,
      latestScore: scanInfo.latestScore ?? null,
      latestSkinAge: scanInfo.latestSkinAge ?? null,
      isActive,
      createdAt: firebaseData.createdAt || (u.createdAt ? new Date(u.createdAt).toISOString() : null),
      lastSignInAt: firebaseData.lastSignInAt || (u.lastLoginAt ? new Date(u.lastLoginAt).toISOString() : null),
    };
  });

  enrichedUsers.sort((a, b) => {
    if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
    const aDate = a.lastScan ? new Date(a.lastScan).getTime() : 0;
    const bDate = b.lastScan ? new Date(b.lastScan).getTime() : 0;
    return bDate - aDate;
  });

  const stats = {
    totalUsers: enrichedUsers.length,
    activeUsers: enrichedUsers.filter((u) => u.isActive).length,
    inactiveUsers: enrichedUsers.filter((u) => !u.isActive).length,
    subscribedUsers: enrichedUsers.filter((u) => u.isSubscribed).length,
    totalScans: Object.values(scanMap).reduce((a, b) => a + b, 0),
    totalSimulations: Object.values(simMap).reduce((a, b) => a + b, 0),
    onboardedUsers: enrichedUsers.filter((u) => u.onboardingComplete).length,
  };

  return { users: enrichedUsers, stats };
}

export default async function AdminPage() {
  const session = await verifyAdminSession();
  if (!session) redirect("/admin/login");

  const { users, stats } = await fetchAdminData();

  return (
    <div style={{ minHeight: "100vh" }}>
      {/* Admin Header */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "rgba(255,255,255,0.6)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderBottom: "1px solid var(--tk-border-solid)",
          padding: "0 24px",
        }}
      >
        <div
          style={{
            maxWidth: "1400px",
            margin: "0 auto",
            height: "64px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <img src="/icon.png" alt="TintKin Admin Logo" style={{ width: "288px", height: "auto", objectFit: "contain", marginLeft: "-8px" }} />
            <span
              style={{
                fontSize: "18px",
                fontWeight: 600,
                fontFamily: "var(--font-display, 'Playfair Display', serif)",
                color: "var(--tk-text-primary)",
                letterSpacing: "-0.5px",
              }}
            >
              Admin
            </span>
            <span
              style={{
                fontSize: "11px",
                padding: "2px 8px",
                borderRadius: "9999px",
                background: "rgba(44, 62, 80, 0.05)",
                color: "var(--tk-text-muted)",
                fontWeight: 500,
              }}
            >
              {session.email}
            </span>
          </div>
          <LogoutButton />
        </div>
      </header>

      {/* Dashboard */}
      <main style={{ maxWidth: "1400px", margin: "0 auto", padding: "24px" }}>
        <AdminDashboard initialUsers={users} initialStats={stats} />
      </main>
    </div>
  );
}

function LogoutButton() {
  return (
    <form
      action={async () => {
        "use server";
        const { adminLogout } = await import("@/app/lib/admin-auth");
        await adminLogout();
        const { redirect } = await import("next/navigation");
        redirect("/admin/login");
      }}
    >
      <button
        type="submit"
        style={{
          padding: "8px 16px",
          background: "transparent",
          border: "1px solid var(--tk-border-solid)",
          borderRadius: "10px",
          color: "var(--tk-text-primary)",
          fontSize: "13px",
          fontWeight: 500,
          cursor: "pointer",
          transition: "all 0.2s",
          fontFamily: "inherit",
        }}
      >
        Sign out
      </button>
    </form>
  );
}
