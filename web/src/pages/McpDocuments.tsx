import { useMemo, useState } from 'react';
import { useOptionalAuth } from '../auth/AuthContext';
import { AppSidebar } from '../components/common/AppSidebar';
import { API_URL } from '../config/api';

export default function McpDocuments() {
  const auth = useOptionalAuth();
  const [copied, setCopied] = useState(false);

  const endpoint = useMemo(() => `${API_URL}/api/mcp`, []);
  const bearerToken = auth?.user?.bearerToken || '';
  const authorizationHeader = bearerToken ? `Bearer ${bearerToken}` : 'Bearer <your-token>';
  const initializeRequest = `{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "clientInfo": { "name": "your-client", "version": "1.0.0" },
    "capabilities": {}
  }
}`;
  const clientConfigSample = `{
  "mcpServers": {
    "ai-referrer": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "${endpoint}",
        "--header",
        "Authorization: ${authorizationHeader}"
      ]
    }
  }
}`;

  async function handleCopyToken() {
    if (!bearerToken) return;
    try {
      await navigator.clipboard.writeText(bearerToken);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#f7f9fb] text-slate-900 antialiased">
      <AppSidebar activeItem="mcp-docs" ariaLabel="Documents Navigation" />

      <main className="relative ml-64 flex min-h-screen flex-col">
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-slate-100 bg-white px-8">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">MCP Documentation</h1>
            <p className="text-xs text-slate-500">Remote MCP integration and authentication guide</p>
          </div>
        </header>

        <div className="flex-1 space-y-6 p-8">
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-700">MCP Endpoint</h2>
            <p className="mt-2 rounded-md bg-slate-900 px-3 py-2 font-mono text-xs text-slate-100">{endpoint}</p>
            <p className="mt-2 text-sm text-slate-600">Request method: `POST`, JSON-RPC 2.0.</p>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-700">Authentication</h2>
            <p className="mt-2 text-sm text-slate-600">Each user has an individual Bearer Token. Pass it in the Authorization header.</p>
            <div className="mt-3 rounded-md bg-slate-50 p-3">
              <p className="text-xs font-semibold text-slate-500">Authorization</p>
              <p className="mt-1 break-all font-mono text-xs text-slate-900">{authorizationHeader}</p>
            </div>
            <button
              type="button"
              onClick={handleCopyToken}
              disabled={!bearerToken}
              className="mt-3 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {copied ? 'Copied' : 'Copy Token'}
            </button>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-700">Features</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
              <li>Currently only one tool is available: `category_attributed_list`.</li>
              <li>Purpose: query the Category Attributed list (data from `/api/reports`).</li>
              <li>Supported filters: `status`, `client`, `search`, `limit`.</li>
            </ul>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-700">MCP Usage</h2>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-700">
              <li>Use Bearer Token in the `Authorization` header for every request.</li>
              <li>Call `initialize` first, then `notifications/initialized`.</li>
              <li>Call `tools/list` to discover tools.</li>
              <li>Call `tools/call` with name `category_attributed_list`.</li>
            </ol>
            <pre className="mt-3 overflow-x-auto rounded-md bg-slate-900 p-3 text-xs text-slate-100">{initializeRequest}</pre>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-700">Example Request</h2>
            <pre className="mt-2 overflow-x-auto rounded-md bg-slate-900 p-3 text-xs text-slate-100">
{`curl -X POST '${endpoint}' \\
  -H 'Content-Type: application/json' \\
  -H 'Authorization: ${authorizationHeader}' \\
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "category_attributed_list",
      "arguments": {
        "status": "Completed",
        "limit": 20
      }
    }
  }'`}
            </pre>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-700">Config Sample (mcp-remote)</h2>
            <p className="mt-2 text-sm text-slate-600">
              Use this JSON in MCP clients that support stdio server configuration (for example via `mcp-remote`).
            </p>
            <pre className="mt-3 overflow-x-auto rounded-md bg-slate-900 p-3 text-xs text-slate-100">{clientConfigSample}</pre>
          </section>
        </div>
      </main>
    </div>
  );
}
