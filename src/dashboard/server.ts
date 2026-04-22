import { pathToFileURL } from "node:url";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { streamSSE } from "hono/streaming";
import { createSqliteStore } from "../storage/sqlite.js";
import type { Store } from "../storage/store.js";
import {
  renderAgentDetail,
  renderAlertDetail,
  renderAlertsFeed,
  renderFleet,
  renderNotFound,
} from "./pages.js";

export interface DashboardOptions {
  readonly store: Store;
  readonly port: number;
  readonly host?: string;
}

export interface DashboardHandle {
  readonly stop: () => Promise<void>;
}

export function createDashboardApp(store: Store): Hono {
  const app = new Hono();

  app.get("/", (c) => {
    const agents = store.listAgents(Date.now());
    return c.html(renderFleet(agents, Date.now()));
  });

  app.get("/agents/:id", (c) => {
    const id = c.req.param("id");
    const events = store.eventsForAgent(id, 50);
    const alerts = store.alertsForAgent(id, 20);
    // Always render — empty state is a valid view (deep-link before first event).
    return c.html(renderAgentDetail(id, events, alerts, Date.now()));
  });

  app.get("/alerts", (c) => {
    const alerts = store.recentAlerts(100);
    return c.html(renderAlertsFeed(alerts, Date.now()));
  });

  app.get("/alerts/:id", (c) => {
    const id = Number(c.req.param("id"));
    if (!Number.isInteger(id) || id <= 0) {
      return c.html(renderNotFound("Invalid alert id"), 404);
    }
    const alert = store.getAlert(id);
    if (!alert) return c.html(renderNotFound(`Alert ${id} not found`), 404);
    return c.html(renderAlertDetail(alert, Date.now()));
  });

  app.get("/api/agents", (c) =>
    c.json({ agents: store.listAgents(Date.now()) }),
  );

  app.get("/api/agents/:id", (c) => {
    const id = c.req.param("id");
    const events = store.eventsForAgent(id, 100);
    const alerts = store.alertsForAgent(id, 50);
    if (events.length === 0 && alerts.length === 0) {
      return c.json({ error: "not_found" }, 404);
    }
    return c.json({ agentId: id, events, alerts });
  });

  app.get("/api/alerts", (c) => c.json({ alerts: store.recentAlerts(100) }));

  app.get("/api/alerts/:id", (c) => {
    const id = Number(c.req.param("id"));
    if (!Number.isInteger(id) || id <= 0) {
      return c.json({ error: "invalid_id" }, 400);
    }
    const alert = store.getAlert(id);
    if (!alert) return c.json({ error: "not_found" }, 404);
    return c.json({ alert });
  });

  // SSE tick stream: reports the count of events/alerts every 2s. Clients
  // reload when they see the numbers change. Trades real-time for simplicity —
  // a pub/sub bus belongs in v0.2 if tick latency becomes a problem.
  app.get("/api/stream", (c) =>
    streamSSE(c, async (stream) => {
      let aborted = false;
      stream.onAbort(() => {
        aborted = true;
      });
      while (!aborted) {
        const events = store.recentEvents(1);
        const alerts = store.recentAlerts(1);
        await stream.writeSSE({
          event: "tick",
          data: JSON.stringify({
            events: events[0]?.timestamp ?? 0,
            alerts: alerts[0]?.timestamp ?? 0,
          }),
        });
        await stream.sleep(2000);
      }
    }),
  );

  return app;
}

export function startDashboard(opts: DashboardOptions): DashboardHandle {
  const app = createDashboardApp(opts.store);
  const server = serve({
    fetch: app.fetch,
    port: opts.port,
    hostname: opts.host ?? "127.0.0.1",
  });

  return {
    async stop(): Promise<void> {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
}

// Standalone entry — `npm run dashboard`.
const entryPath = process.argv[1];
const isMain =
  !!entryPath && import.meta.url === pathToFileURL(entryPath).href;
if (isMain) {
  const dbPath = process.env.ARGUS_DB ?? "argus-demo.sqlite";
  const port = Number(process.env.ARGUS_PORT ?? 4317);
  const host = process.env.ARGUS_HOST ?? "127.0.0.1";
  const store = createSqliteStore(dbPath);
  startDashboard({ store, port, host });
  process.stdout.write(`[argus] dashboard on http://${host}:${port} (db=${dbPath})\n`);
  process.on("SIGINT", () => {
    store.close();
    process.exit(0);
  });
}
