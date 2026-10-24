/**
 * A one-time "what's new" pop-up for people who were using TintKin before the
 * plan-first redesign. Accounts created after `cutoff` have never known the old
 * app, so they don't see it. Bump `id` (and `cutoff`) for the next announcement;
 * each account's dismissals are stored on the user, so it shows once per id.
 */
export const CURRENT_ANNOUNCEMENT = Object.freeze({
  id: 'plan-2026-10',
  cutoff: new Date('2026-10-30T00:00:00Z'),
});

/**
 * @param {{ createdAt?: Date|string, seenAnnouncements?: string[] }} user
 * @returns {boolean}
 */
export function shouldShowAnnouncement(user, announcement = CURRENT_ANNOUNCEMENT) {
  if (!user?.createdAt) return false;
  if (new Date(user.createdAt) >= announcement.cutoff) return false;
  return !(user.seenAnnouncements || []).includes(announcement.id);
}
