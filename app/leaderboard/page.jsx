import { getLeaderboard } from "@/app/lib/actions";
import LeaderboardClient from "./LeaderboardClient";

const DEFAULT_SCOPE = "city";

export default function LeaderboardPage() {
    // Kicked off here (not awaited) so the DB query for the default scope
    // starts at request time instead of waiting for the client to hydrate.
    const initialDataPromise = getLeaderboard(DEFAULT_SCOPE);
    return <LeaderboardClient initialScope={DEFAULT_SCOPE} initialDataPromise={initialDataPromise} />;
}
