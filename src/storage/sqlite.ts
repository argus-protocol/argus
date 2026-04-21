import Database from "better-sqlite3";
import type { Database as DatabaseType } from "better-sqlite3";
import { parseAgentEvent, type AgentEvent } from "../core/events.js";
import type { PolicyAlert } from "../core/policies.js";
import type { Store } from "./store.js";

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
  policy_id: string;
  policy_kind: string;
  event_payload: string;
  reason: string;
  severity: string;
  timestamp: number;
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
    `SELECT policy_id, policy_kind, event_payload, reason, severity, timestamp
     FROM alerts ORDER BY timestamp DESC LIMIT ?`,
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

    recentAlerts(limit: number): PolicyAlert[] {
      const rows = selectRecentAlerts.all(limit) as AlertRow[];
      return rows.map((row) => ({
        policyId: row.policy_id,
        policyKind: row.policy_kind,
        event: parseAgentEvent(JSON.parse(row.event_payload)),
        reason: row.reason,
        severity: row.severity as PolicyAlert["severity"],
        timestamp: row.timestamp,
      }));
    },

    close(): void {
      db.close();
    },
  };
}
