import type { QueryResult, QueryResultRow } from "pg";

export const SCENARIO_USER_ID = "synthetic:vv-admin";
export const SCENARIO_COIN_MINOR = 10_000;

export class ScenarioPaymentBlocked extends Error {
  constructor(readonly merchantOrderId: string, readonly providerCode: string | null) {
    super("SCENARIO_ATTEMPT_REQUIRES_REVIEW");
  }
}

/** Caller holds the same per-user transaction lock used for top-up creation. */
export async function checkScenarioAdmission(
  client: { query<Row extends QueryResultRow>(sql: string, values: readonly unknown[]): Promise<QueryResult<Row>> },
  userId: string,
  replayId?: string,
): Promise<void> {
  if (userId !== SCENARIO_USER_ID) return;
  const { rows: [blocker] } = await client.query<{id: string; code: string | null}>(`
    SELECT id, metadata->>'providerErrorCode' AS code FROM top_up_payments
    WHERE user_id=$1 AND status IN ('provider_creation_pending','checkout_pending','manual_review')
      AND ($2::uuid IS NULL OR id=$2 AND status='manual_review')
    ORDER BY created_at LIMIT 1`, [userId, replayId ?? null]);
  if (blocker) throw new ScenarioPaymentBlocked(blocker.id, blocker.code);
}
