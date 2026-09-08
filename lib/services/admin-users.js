import 'server-only';
import { connectDb, User, Selfie, Simulation } from '@/app/lib/mongoose';
import { adminAuth } from '@/app/lib/firebase/admin';
import { STATUS } from '@/lib/constants/status';

/**
 * Fetches, aggregates, and enriches all user records with stats for the admin ops console.
 * @returns {Promise<{ users: import('../types/user').EnrichedAdminUser[], stats: Object }>}
 */
export async function fetchAdminData() {
  await connectDb();

  const users = await User.find({}).lean();

  /** @type {Record<string, any>} */
  let firebaseUsersMap = {};
  /** @type {import('../types/result').OperationStatus} */
  let firebaseSyncStatus = adminAuth ? STATUS.OK : STATUS.EMPTY;
  if (adminAuth) {
    try {
      let pageToken = undefined;
      let hasMore = true;
      while (hasMore) {
        const listUsersResult = await adminAuth.listUsers(1000, pageToken);
        listUsersResult.users.forEach((u) => {
          firebaseUsersMap[u.uid] = {
            email: u.email || 'N/A',
            firstName: u.displayName ? u.displayName.split(' ')[0] : '',
            lastName: u.displayName ? u.displayName.split(' ').slice(1).join(' ') : '',
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
    } catch {
      firebaseSyncStatus = STATUS.ERROR;
    }
  }

  const userIds = users.map((u) => u._id);

  const [scanCounts, simCounts, lastScans] = await Promise.all([
    Selfie.aggregate([
      { $match: { userId: { $in: userIds } } },
      { $group: { _id: '$userId', count: { $sum: 1 } } },
    ]),
    Simulation.aggregate([
      { $match: { userId: { $in: userIds } } },
      { $group: { _id: '$userId', count: { $sum: 1 } } },
    ]),
    Selfie.aggregate([
      { $match: { userId: { $in: userIds } } },
      { $sort: { takenAt: -1 } },
      {
        $group: {
          _id: '$userId',
          lastScan: { $first: '$takenAt' },
          latestScore: { $first: '$overallScore' },
          latestSkinAge: { $first: '$skinAge' },
        },
      },
    ]),
  ]);

  /** @type {Record<string, any>} */
  const scanMap = {};
  scanCounts.forEach((s) => (scanMap[s._id.toString()] = s.count));
  /** @type {Record<string, any>} */
  const simMap = {};
  simCounts.forEach((s) => (simMap[s._id.toString()] = s.count));
  /** @type {Record<string, any>} */
  const lastScanMap = {};
  lastScans.forEach((s) => {
    lastScanMap[s._id.toString()] = {
      lastScan: s.lastScan,
      latestScore: s.latestScore,
      latestSkinAge: s.latestSkinAge,
    };
  });

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const enrichedUsers = users.map((/** @type {any} */ u) => {
    const uid = u._id.toString();
    const firebaseData = firebaseUsersMap[u.firebaseUid] || {};
    const scanInfo = lastScanMap[uid] || {};
    const lastScanDate = scanInfo.lastScan ? new Date(scanInfo.lastScan) : null;
    const isActive = Boolean(lastScanDate && lastScanDate > sevenDaysAgo);

    return {
      _id: uid,
      firebaseUid: u.firebaseUid,
      email: firebaseData.email || u.email || 'N/A',
      firstName: firebaseData.firstName || u.displayName?.split(' ')[0] || '',
      lastName: firebaseData.lastName || u.displayName?.split(' ').slice(1).join(' ') || '',
      imageUrl: firebaseData.imageUrl || u.photoURL || null,
      sex: u.sex || 'N/A',
      skinType: u.skinType || 'N/A',
      goals: u.goals || [],
      customGoal: u.customGoal || '',
      onboardingComplete: u.onboardingComplete || false,
      isSubscribed: u.isSubscribed || false,
      tier: u.tier || 'free',
      extraScans: u.extraScans || 0,
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
    firebaseSyncStatus,
  };

  return { users: enrichedUsers, stats };
}
