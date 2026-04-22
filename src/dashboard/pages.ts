import type { AgentEvent } from "../core/events.js";
import type { AgentSummary, StoredAlert } from "../storage/store.js";
import {
  esc,
  formatRelative,
  formatWeiEth,
  layout,
  severityBadge,
  shortAddr,
} from "./html.js";

export function renderFleet(agents: AgentSummary[], nowMs: number): string {
  const body =
    agents.length === 0
      ? `<div class="text-slate-400 text-center py-16 border border-dashed border-slate-800 rounded-lg">
           No agents observed yet. Run an adapter to start capturing events.
         </div>`
      : `
    <div class="mb-4 flex items-baseline justify-between">
      <h1 class="text-xl font-semibold">Fleet</h1>
      <span class="text-xs text-slate-500">${agents.length} agent${agents.length === 1 ? "" : "s"} · last 24h</span>
    </div>
    <div class="grid gap-3 sm:hidden">
      ${agents.map((a) => renderAgentCard(a, nowMs)).join("")}
    </div>
    <div class="hidden sm:block border border-slate-800 rounded-lg overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-slate-900 text-slate-400 text-xs uppercase">
          <tr>
            <th class="text-left px-4 py-2 font-medium">Agent</th>
            <th class="text-left px-4 py-2 font-medium">Wallet</th>
            <th class="text-right px-4 py-2 font-medium">Tx 24h</th>
            <th class="text-right px-4 py-2 font-medium">Spend 24h</th>
            <th class="text-right px-4 py-2 font-medium">Alerts 24h</th>
            <th class="text-right px-4 py-2 font-medium">Last seen</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-800">
          ${agents.map((a) => renderAgentRow(a, nowMs)).join("")}
        </tbody>
      </table>
    </div>`;

  return layout({ title: "Argus — Fleet", active: "fleet", body });
}

function renderAgentRow(a: AgentSummary, nowMs: number): string {
  const alertsCell =
    a.alertCount24h > 0
      ? `<span class="text-red-300 font-semibold">${a.alertCount24h}</span>`
      : `<span class="text-slate-500">0</span>`;
  return `
    <tr class="hover:bg-slate-900/40">
      <td class="px-4 py-3">
        <a href="/agents/${encodeURIComponent(a.agentId)}" class="font-medium hover:underline">${esc(a.agentId)}</a>
        <div class="text-xs text-slate-500">chain ${esc(a.chainId)}</div>
      </td>
      <td class="px-4 py-3 mono text-xs text-slate-300">${esc(shortAddr(a.wallet))}</td>
      <td class="px-4 py-3 text-right">${esc(a.txCount24h)}</td>
      <td class="px-4 py-3 text-right mono">${esc(formatWeiEth(a.spendWei24h))} ETH</td>
      <td class="px-4 py-3 text-right">${alertsCell}</td>
      <td class="px-4 py-3 text-right text-slate-400 text-xs">${esc(formatRelative(a.lastSeen, nowMs))}</td>
    </tr>`;
}

function renderAgentCard(a: AgentSummary, nowMs: number): string {
  const alertsLine =
    a.alertCount24h > 0
      ? `<span class="text-red-300 font-semibold">${a.alertCount24h} alert${a.alertCount24h === 1 ? "" : "s"}</span>`
      : `<span class="text-slate-500">no alerts</span>`;
  return `
    <a href="/agents/${encodeURIComponent(a.agentId)}"
       class="block p-4 rounded-lg border border-slate-800 bg-slate-900/40 hover:bg-slate-900/80 transition">
      <div class="flex items-baseline justify-between">
        <div class="font-medium">${esc(a.agentId)}</div>
        <div class="text-xs text-slate-500">${esc(formatRelative(a.lastSeen, nowMs))}</div>
      </div>
      <div class="mono text-xs text-slate-400 mt-1">${esc(shortAddr(a.wallet))} · chain ${esc(a.chainId)}</div>
      <div class="mt-3 flex items-center gap-4 text-sm">
        <div><span class="text-slate-500">tx</span> ${esc(a.txCount24h)}</div>
        <div><span class="text-slate-500">spend</span> <span class="mono">${esc(formatWeiEth(a.spendWei24h))}</span> ETH</div>
        <div>${alertsLine}</div>
      </div>
    </a>`;
}

export function renderAgentDetail(
  agentId: string,
  events: AgentEvent[],
  alerts: StoredAlert[],
  nowMs: number,
): string {
  const header = `
    <div class="mb-6">
      <a href="/" class="text-xs text-slate-400 hover:text-white">← Fleet</a>
      <h1 class="text-xl font-semibold mt-1">${esc(agentId)}</h1>
      ${events[0] ? `<div class="mono text-xs text-slate-500 mt-1">${esc(events[0].wallet)} · chain ${esc(events[0].chainId)}</div>` : ""}
    </div>`;

  const alertsBlock = alerts.length
    ? `<section class="mb-8">
         <h2 class="text-sm uppercase tracking-wide text-slate-400 mb-2">Recent alerts</h2>
         <div class="space-y-2">
           ${alerts.map((a) => renderAlertRow(a, nowMs)).join("")}
         </div>
       </section>`
    : "";

  const eventsBlock = events.length
    ? `<section>
         <h2 class="text-sm uppercase tracking-wide text-slate-400 mb-2">Recent events</h2>
         <div class="border border-slate-800 rounded-lg divide-y divide-slate-800 overflow-hidden">
           ${events.map((e) => renderEventRow(e, nowMs)).join("")}
         </div>
       </section>`
    : `<div class="text-slate-500 text-sm">No events recorded for this agent.</div>`;

  return layout({
    title: `Argus — ${agentId}`,
    active: "fleet",
    body: header + alertsBlock + eventsBlock,
  });
}

function renderEventRow(e: AgentEvent, nowMs: number): string {
  if (e.kind === "tx_send") {
    return `
      <div class="px-4 py-3 flex items-start justify-between gap-4 hover:bg-slate-900/40">
        <div class="min-w-0">
          <div class="text-xs text-slate-400">tx_send → <span class="mono text-slate-200">${esc(shortAddr(e.to))}</span></div>
          <div class="mono text-sm mt-0.5">${esc(formatWeiEth(e.valueWei))} ETH</div>
        </div>
        <div class="text-xs text-slate-500 whitespace-nowrap">${esc(formatRelative(e.timestamp, nowMs))}</div>
      </div>`;
  }
  return `
    <div class="px-4 py-3 flex items-start justify-between gap-4 hover:bg-slate-900/40">
      <div>
        <div class="text-xs text-slate-400">${esc(e.kind)}</div>
        <div class="mono text-xs text-slate-500 mt-0.5">${esc(e.id)}</div>
      </div>
      <div class="text-xs text-slate-500 whitespace-nowrap">${esc(formatRelative(e.timestamp, nowMs))}</div>
    </div>`;
}

function renderAlertRow(a: StoredAlert, nowMs: number): string {
  return `
    <a href="/alerts/${a.id}" class="block p-3 rounded-lg border border-slate-800 bg-slate-900/40 hover:bg-slate-900/80 transition">
      <div class="flex items-baseline justify-between gap-3">
        <div class="flex items-center gap-2">
          ${severityBadge(a.severity)}
          <span class="text-sm font-medium">${esc(a.policyKind)}</span>
          <span class="text-xs text-slate-500">${esc(a.policyId)}</span>
        </div>
        <span class="text-xs text-slate-500">${esc(formatRelative(a.timestamp, nowMs))}</span>
      </div>
      <div class="text-sm text-slate-300 mt-1 line-clamp-2">${esc(a.reason)}</div>
    </a>`;
}

export function renderAlertsFeed(alerts: StoredAlert[], nowMs: number): string {
  const body = alerts.length
    ? `
      <div class="mb-4 flex items-baseline justify-between">
        <h1 class="text-xl font-semibold">Alerts</h1>
        <span class="text-xs text-slate-500">${alerts.length} shown · newest first</span>
      </div>
      <div class="space-y-2">
        ${alerts.map((a) => renderAlertRow(a, nowMs)).join("")}
      </div>`
    : `<div class="text-slate-400 text-center py-16 border border-dashed border-slate-800 rounded-lg">
         No alerts yet.
       </div>`;
  return layout({ title: "Argus — Alerts", active: "alerts", body });
}

export function renderAlertDetail(alert: StoredAlert, nowMs: number): string {
  const e = alert.event;
  const eventBlock =
    e.kind === "tx_send"
      ? `
      <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
        <div><dt class="text-xs text-slate-500">to</dt><dd class="mono">${esc(e.to)}</dd></div>
        <div><dt class="text-xs text-slate-500">value</dt><dd class="mono">${esc(formatWeiEth(e.valueWei))} ETH <span class="text-slate-500">(${esc(e.valueWei)} wei)</span></dd></div>
        <div><dt class="text-xs text-slate-500">wallet</dt><dd class="mono">${esc(e.wallet)}</dd></div>
        <div><dt class="text-xs text-slate-500">chain</dt><dd>${esc(e.chainId)}</dd></div>
        <div><dt class="text-xs text-slate-500">agent</dt><dd><a class="hover:underline" href="/agents/${encodeURIComponent(e.agentId)}">${esc(e.agentId)}</a></dd></div>
        <div><dt class="text-xs text-slate-500">source</dt><dd>${esc(e.source)}</dd></div>
      </dl>
      ${e.data ? `<pre class="mt-4 p-3 rounded bg-slate-900 border border-slate-800 text-xs mono overflow-x-auto">${esc(e.data)}</pre>` : ""}
      `
      : `<dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
           <div><dt class="text-xs text-slate-500">kind</dt><dd>${esc(e.kind)}</dd></div>
           <div><dt class="text-xs text-slate-500">wallet</dt><dd class="mono">${esc(e.wallet)}</dd></div>
           <div><dt class="text-xs text-slate-500">chain</dt><dd>${esc(e.chainId)}</dd></div>
           <div><dt class="text-xs text-slate-500">agent</dt><dd><a class="hover:underline" href="/agents/${encodeURIComponent(e.agentId)}">${esc(e.agentId)}</a></dd></div>
           <div><dt class="text-xs text-slate-500">source</dt><dd>${esc(e.source)}</dd></div>
           ${e.kind === "session_key_added" ? `<div class="sm:col-span-2"><dt class="text-xs text-slate-500">session key</dt><dd class="mono text-xs">${esc(e.keyAddress)}</dd></div>` : ""}
         </dl>`;

  const body = `
    <div class="mb-6">
      <a href="/alerts" class="text-xs text-slate-400 hover:text-white">← Alerts</a>
      <div class="flex items-center gap-3 mt-1">
        ${severityBadge(alert.severity)}
        <h1 class="text-xl font-semibold">${esc(alert.policyKind)}</h1>
      </div>
      <div class="text-xs text-slate-500 mt-1">${esc(alert.policyId)} · ${esc(formatRelative(alert.timestamp, nowMs))} · ${esc(new Date(alert.timestamp).toISOString())}</div>
    </div>
    <section class="mb-6 p-4 rounded-lg border border-red-500/20 bg-red-500/5">
      <div class="text-xs uppercase tracking-wide text-red-300 mb-1">Reason</div>
      <div class="text-sm">${esc(alert.reason)}</div>
    </section>
    <section class="p-4 rounded-lg border border-slate-800 bg-slate-900/40">
      <div class="text-xs uppercase tracking-wide text-slate-400 mb-3">Triggering event</div>
      ${eventBlock}
      <div class="text-xs text-slate-500 mt-4 mono">${esc(e.id)}</div>
    </section>
    <section class="mt-6 flex gap-2 text-sm">
      <button disabled class="px-3 py-1.5 rounded-md bg-slate-800 text-slate-500 cursor-not-allowed" title="Kill-switch lands in v0.3">Revoke (v0.3)</button>
      <button disabled class="px-3 py-1.5 rounded-md bg-slate-800 text-slate-500 cursor-not-allowed" title="Acknowledgements land in v0.2">Acknowledge</button>
    </section>`;
  return layout({ title: `Argus — Alert #${alert.id}`, active: "alerts", body });
}

export function renderNotFound(message: string): string {
  return layout({
    title: "Argus — Not found",
    active: "fleet",
    body: `<div class="text-center py-20">
      <div class="text-2xl font-semibold mb-2">Not found</div>
      <div class="text-slate-400 text-sm">${esc(message)}</div>
      <a href="/" class="inline-block mt-6 text-sm text-sky-400 hover:underline">← Back to Fleet</a>
    </div>`,
  });
}
