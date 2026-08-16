import { verifyAdminSession } from "@/app/lib/admin-auth";
import { connectDb, User, Selfie, Simulation } from "@/app/lib/mongoose";
import { adminAuth } from "@/app/lib/firebase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await verifyAdminSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDb();

    // Fetch all users from MongoDB
    const users = await User.find({}).lean();

    // Fetch Firebase user data for all users
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
            lastSignInAt: u.metadata.lastSignInTime ? new Date(u.metadata.lastSignInTime).getTime() : null,
            createdAt: u.metadata.creationTime ? new Date(u.metadata.creationTime).getTime() : null,
          };
        });
        if (listUsersResult.pageToken) {
          pageToken = listUsersResult.pageToken;
        } else {
          hasMore = false;
        }
      }
    } catch (err) {
      console.error("[Admin Users] Firebase fetch error:", err);
    }

    // Aggregate scan and simulation counts per user
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
        { $group: { _id: "$userId", lastScan: { $first: "$takenAt" }, latestScore: { $first: "$overallScore" }, latestSkinAge: { $first: "$skinAge" } } },
      ]),
    ]);

    // Build lookup maps
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

    // Enrich users
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
        subscribedAt: u.subscribedAt || null,
        birthDate: u.birthDate || null,
        scanCount: scanMap[uid] || 0,
        simulationCount: simMap[uid] || 0,
        lastScan: scanInfo.lastScan || null,
        latestScore: scanInfo.latestScore ?? null,
        latestSkinAge: scanInfo.latestSkinAge ?? null,
        isActive,
        createdAt: firebaseData.createdAt || u.createdAt || null,
        lastSignInAt: firebaseData.lastSignInAt || u.lastLoginAt || null,
      };
    });

    // Sort: active first, then by last scan date desc
    enrichedUsers.sort((a, b) => {
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
      const aDate = a.lastScan ? new Date(a.lastScan).getTime() : 0;
      const bDate = b.lastScan ? new Date(b.lastScan).getTime() : 0;
      return bDate - aDate;
    });

    // Compute summary stats
    const stats = {
      totalUsers: enrichedUsers.length,
      activeUsers: enrichedUsers.filter((u) => u.isActive).length,
      inactiveUsers: enrichedUsers.filter((u) => !u.isActive).length,
      subscribedUsers: enrichedUsers.filter((u) => u.isSubscribed).length,
      totalScans: Object.values(scanMap).reduce((a, b) => a + b, 0),
      totalSimulations: Object.values(simMap).reduce((a, b) => a + b, 0),
      onboardedUsers: enrichedUsers.filter((u) => u.onboardingComplete).length,
    };

    return Response.json({ success: true, users: enrichedUsers, stats });
  } catch (err) {
    console.error("[Admin Users] Error:", err);
    return Response.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
