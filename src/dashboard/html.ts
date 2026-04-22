// Minimal SSR helpers. No templating engine on purpose — a forked integrator
// should be able to read and restyle these files without learning anything.

export function esc(value: string | number | bigint): string {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function shortAddr(addr: string): string {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function formatWeiEth(wei: string): string {
  const n = BigInt(wei);
  const whole = n / 10n ** 18n;
  const frac = n % 10n ** 18n;
  const fracStr = frac.toString().padStart(18, "0").slice(0, 4);
  return `${whole.toString()}.${fracStr}`;
}

export function formatRelative(tsMs: number, nowMs: number): string {
  const deltaS = Math.max(0, Math.round((nowMs - tsMs) / 1000));
  if (deltaS < 60) return `${deltaS}s ago`;
  if (deltaS < 3600) return `${Math.round(deltaS / 60)}m ago`;
  if (deltaS < 86400) return `${Math.round(deltaS / 3600)}h ago`;
  return `${Math.round(deltaS / 86400)}d ago`;
}

export function layout(opts: {
  title: string;
  active: "fleet" | "alerts";
  body: string;
}): string {
  return `<!doctype html>
<html lang="en" class="h-full bg-slate-950">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(opts.title)}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
  </style>
</head>
<body class="min-h-full text-slate-100">
  <header class="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-10">
    <div class="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
      <a href="/" class="flex items-center gap-2 font-semibold tracking-tight">
        <span class="inline-block w-2 h-2 rounded-full bg-emerald-400"></span>
        Argus
      </a>
      <nav class="flex gap-1 text-sm">
        <a href="/" class="px-3 py-1.5 rounded-md ${opts.active === "fleet" ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white"}">Fleet</a>
        <a href="/alerts" class="px-3 py-1.5 rounded-md ${opts.active === "alerts" ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white"}">Alerts</a>
      </nav>
    </div>
  </header>
  <main class="max-w-5xl mx-auto px-4 py-6">${opts.body}</main>
  <script>
    // Live-refresh: re-fetch the current page when server signals new data.
    (function () {
      try {
        var es = new EventSource("/api/stream");
        var last = null;
        es.addEventListener("tick", function (ev) {
          var data = JSON.parse(ev.data);
          if (last && (data.events !== last.events || data.alerts !== last.alerts)) {
            window.location.reload();
          }
          last = data;
        });
      } catch (e) { /* SSE unsupported — ignore */ }
    })();
  </script>
</body>
</html>`;
}

export function severityBadge(severity: "info" | "warning" | "critical"): string {
  const cls =
    severity === "critical"
      ? "bg-red-500/15 text-red-300 ring-red-500/30"
      : severity === "warning"
        ? "bg-yellow-500/15 text-yellow-200 ring-yellow-500/30"
        : "bg-sky-500/15 text-sky-200 ring-sky-500/30";
  return `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs ring-1 ${cls}">${esc(severity)}</span>`;
}
