import { getWeeklyHistory } from "@/app/lib/actions";
import HistoryClient from "./HistoryClient";

export default function HistoryPage() {
    // Kicked off here (not awaited) so the DB query starts at request time
    // instead of waiting for the client bundle to hydrate before it can fetch.
    const historyPromise = getWeeklyHistory();
    return <HistoryClient historyPromise={historyPromise} />;
}
