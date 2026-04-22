import Database from "better-sqlite3";
import type { Database as DatabaseType } from "better-sqlite3";
import { parseAgentEvent, type AgentEvent } from "../core/events.js";
import type { PolicyAlert } from "../core/policies.js";
import type { AgentSummary, Store, StoredAlert } from "./store.js";

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    timestamp INTEGER NOT NULL,
    agent_id TEXT NOT NULL,
    wallet TEXT NOT NULL,
    chain_id INTEGER NOT NULL,
    source TEXT NOT NULL,
    kind TEXT NOT NULL,
    payload TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp DESC);

  CREATE TABLE IF NOT EXISTS policy_state (
    policy_id TEXT PRIMARY KEY,
    state TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    policy_id TEXT NOT NULL,
    policy_kind TEXT NOT NULL,
    event_id TEXT NOT NULL,
    event_payload TEXT NOT NULL,
    reason TEXT NOT NULL,
    severity TEXT NOT NULL,
    timestamp INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_alerts_timestamp ON alerts(timestamp DESC);
`;

interface EventRow {
  payload: string;
}

interface PolicyStateRow {
  state: string;
}

interface AlertRow {
  id: number;
  policy_id: string;
  policy_kind: string;
  event_payload: string;
  reason: string;
  severity: string;
  timestamp: number;
}

function rowToStoredAlert(row: AlertRow): StoredAlert {
  return {
    id: row.id,
    policyId: row.policy_id,
    policyKind: row.policy_kind,
    event: parseAgentEvent(JSON.parse(row.event_payload)),
    reason: row.reason,
    severity: row.severity as PolicyAlert["severity"],
    timestamp: row.timestamp,
  };
}

export function createSqliteStore(filename: string): Store {
  const db: DatabaseType = new Database(filename);
  db.pragma("journal_mode = WAL");
  db.exec(SCHEMA);

  const insertEvent = db.prepare(
    `INSERT OR REPLACE INTO events
     (id, timestamp, agent_id, wallet, chain_id, source, kind, payload)
     VALUES (@id, @timestamp, @agent_id, @wallet, @chain_id, @source, @kind, @payload)`,
  );

  const selectRecentEvents = db.prepare(
    `SELECT payload FROM events ORDER BY timestamp DESC LIMIT ?`,
  );

  const getPolicyStateStmt = db.prepare(
    `SELECT state FROM policy_state WHERE policy_id = ?`,
  );

  const putPolicyStateStmt = db.prepare(
    `INSERT INTO policy_state (policy_id, state) VALUES (?, ?)
     ON CONFLICT(policy_id) DO UPDATE SET state = excluded.state`,
  );

  const insertAlert = db.prepare(
    `INSERT INTO alerts
     (policy_id, policy_kind, event_id, event_payload, reason, severity, timestamp)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );

  const selectRecentAlerts = db.prepare(
    `SELECT id, policy_id, policy_kind, event_payload, reason, severity, timestamp
     FROM alerts ORDER BY timestamp DESC LIMIT ?`,
  );

  const selectEventsForAgent = db.prepare(
    `SELECT payload FROM events WHERE agent_id = ?
     ORDER BY timestamp DESC LIMIT ?`,
  );

  const selectAlertsForAgent = db.prepare(
    `SELECT a.id, a.policy_id, a.policy_kind, a.event_payload,
            a.reason, a.severity, a.timestamp
     FROM alerts a
     WHERE json_extract(a.event_payload, '$.agentId') = ?
     ORDER BY a.timestamp DESC LIMIT ?`,
  );

  const selectAlertById = db.prepare(
    `SELECT id, policy_id, policy_kind, event_payload, reason, severity, timestamp
     FROM alerts WHERE id = ?`,
  );

  // Spend is summed in JS with BigInt to avoid SQLite INTEGER overflow at
  // 2^63 wei (~9.22 ETH). A single DeFi rebalance can exceed that.
  const selectAgentLastAndCounts = db.prepare(
    `WITH last_events AS (
       SELECT agent_id, wallet, chain_id, timestamp,
              ROW_NUMBER() OVER (PARTITION BY agent_id ORDER BY timestamp DESC) AS rn
       FROM events
     ),
     tx_24h AS (
       SELECT agent_id, COUNT(*) AS tx_count
       FROM events
       WHERE kind = 'tx_send' AND timestamp >= ?
       GROUP BY agent_id
     ),
     alerts_24h AS (
       SELECT json_extract(event_payload, '$.agentId') AS agent_id,
              COUNT(*) AS alert_count
       FROM alerts
       WHERE timestamp >= ?
       GROUP BY agent_id
     )
     SELECT le.agent_id         AS agent_id,
            le.wallet           AS wallet,
            le.chain_id         AS chain_id,
            le.timestamp        AS last_seen,
            COALESCE(t.tx_count, 0)       AS tx_count_24h,
            COALESCE(a.alert_count, 0)    AS alert_count_24h
     FROM last_events le
     LEFT JOIN tx_24h    t ON t.agent_id = le.agent_id
     LEFT JOIN alerts_24h a ON a.agent_id = le.agent_id
     WHERE le.rn = 1
     ORDER BY le.timestamp DESC`,
  );

  const selectSpendValuesSince = db.prepare(
    `SELECT agent_id, json_extract(payload, '$.valueWei') AS value_wei
     FROM events
     WHERE kind = 'tx_send' AND timestamp >= ?`,
  );

  return {
    appendEvent(event: AgentEvent): void {
      insertEvent.run({
        id: event.id,
        timestamp: event.timestamp,
        agent_id: event.agentId,
        wallet: event.wallet,
        chain_id: event.chainId,
        source: event.source,
        kind: event.kind,
        payload: JSON.stringify(event),
      });
    },

    recentEvents(limit: number): AgentEvent[] {
      const rows = selectRecentEvents.all(limit) as EventRow[];
      return rows.map((row) => parseAgentEvent(JSON.parse(row.payload)));
    },

    getPolicyState(policyId: string): unknown | null {
      const row = getPolicyStateStmt.get(policyId) as PolicyStateRow | undefined;
      return row ? JSON.parse(row.state) : null;
    },

    putPolicyState(policyId: string, state: unknown): void {
      putPolicyStateStmt.run(policyId, JSON.stringify(state));
    },

    appendAlert(alert: PolicyAlert): void {
      insertAlert.run(
        alert.policyId,
        alert.policyKind,
        alert.event.id,
        JSON.stringify(alert.event),
        alert.reason,
        alert.severity,
        alert.timestamp,
      );
    },

    recentAlerts(limit: number): StoredAlert[] {
      const rows = selectRecentAlerts.all(limit) as AlertRow[];
      return rows.map(rowToStoredAlert);
    },

    alertsForAgent(agentId: string, limit: number): StoredAlert[] {
      const rows = selectAlertsForAgent.all(agentId, limit) as AlertRow[];
      return rows.map(rowToStoredAlert);
    },

    getAlert(id: number): StoredAlert | null {
      const row = selectAlertById.get(id) as AlertRow | undefined;
      return row ? rowToStoredAlert(row) : null;
    },

    eventsForAgent(agentId: string, limit: number): AgentEvent[] {
      const rows = selectEventsForAgent.all(agentId, limit) as EventRow[];
      return rows.map((row) => parseAgentEvent(JSON.parse(row.payload)));
    },

    listAgents(nowMs: number): AgentSummary[] {
      const since = nowMs - 24 * 60 * 60 * 1000;
      const rows = selectAgentLastAndCounts.all(since, since) as Array<{
        agent_id: string;
        wallet: string;
        chain_id: number;
        last_seen: number;
        tx_count_24h: number;
        alert_count_24h: number;
      }>;

      const spendRows = selectSpendValuesSince.all(since) as Array<{
        agent_id: string;
        value_wei: string | null;
      }>;
      const spendByAgent = new Map<string, bigint>();
      for (const r of spendRows) {
        if (!r.value_wei) continue;
        spendByAgent.set(
          r.agent_id,
          (spendByAgent.get(r.agent_id) ?? 0n) + BigInt(r.value_wei),
        );
      }

      return rows.map((r) => ({
        agentId: r.agent_id,
        wallet: r.wallet,
        chainId: r.chain_id,
        lastSeen: r.last_seen,
        txCount24h: r.tx_count_24h,
        spendWei24h: (spendByAgent.get(r.agent_id) ?? 0n).toString(),
        alertCount24h: r.alert_count_24h,
      }));
    },

    close(): void {
      db.close();
    },
  };
}
