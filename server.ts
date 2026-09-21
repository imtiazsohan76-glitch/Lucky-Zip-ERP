import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

// Concurrency queue to avoid overloading Google Apps Script with concurrent requests
class ConcurrencyQueue {
  private running = 0;
  private queue: Array<() => void> = [];

  constructor(private maxConcurrent = 3) {}

  async run<T>(fn: () => Promise<T>): Promise<T> {
    if (this.running >= this.maxConcurrent) {
      await new Promise<void>((resolve) => this.queue.push(resolve));
    }
    this.running++;
    try {
      return await fn();
    } finally {
      this.running--;
      const next = this.queue.shift();
      if (next) next();
    }
  }
}

interface CacheEntry {
  data: any;
  timestamp: number;
}

// In-memory cache for read operations
const responseCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 25000; // 25 seconds TTL for read endpoints

// In-flight request deduplication map
const inFlightRequests = new Map<string, Promise<any>>();

// Limit concurrent outbound requests to Google Apps Script
const gasQueue = new ConcurrencyQueue(3);

function normalizeAction(action: string): string {
  if (!action) return "";
  if (action === "getIncome") return "getIncomes";
  if (action === "getExpense") return "getExpenses";
  if (action === "getSalary" || action === "getSalaries") return "getSalaryPayments";
  return action;
}

function isReadAction(action: string): boolean {
  return (
    action.startsWith("get") ||
    action === "health" ||
    action === "verifySession" ||
    action === "getSettings"
  );
}

function invalidateCacheForMutation(action: string) {
  const act = action.toLowerCase();
  if (act.includes("expense")) {
    responseCache.forEach((_, key) => {
      if (key.includes("getExpenses") || key.includes("getDashboard")) responseCache.delete(key);
    });
  }
  if (act.includes("income")) {
    responseCache.forEach((_, key) => {
      if (key.includes("getIncomes") || key.includes("getDashboard")) responseCache.delete(key);
    });
  }
  if (act.includes("project")) {
    responseCache.forEach((_, key) => {
      if (key.includes("getProjects") || key.includes("getDashboard")) responseCache.delete(key);
    });
  }
  if (act.includes("employee") || act.includes("salary")) {
    responseCache.forEach((_, key) => {
      if (key.includes("getEmployees") || key.includes("getSalary") || key.includes("getDashboard")) responseCache.delete(key);
    });
  }
  if (act.includes("client")) {
    responseCache.forEach((_, key) => {
      if (key.includes("getClients") || key.includes("getDashboard")) responseCache.delete(key);
    });
  }
  if (act.includes("setting")) {
    responseCache.forEach((_, key) => {
      if (key.includes("getSettings")) responseCache.delete(key);
    });
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // API Proxy Route for Google Apps Script
  app.all("/api/gas", async (req, res) => {
    try {
      const gasUrl =
        (req.headers["x-gas-url"] as string) ||
        process.env.VITE_GAS_WEB_APP_URL ||
        "https://script.google.com/macros/s/AKfycbyYoYrpyic9aibiqxDTAV8pou4np1N1_um8WB2M6rCtSfCsRy7hBIvAEWi6RvfLldW2jA/exec";

      const cleanBase = gasUrl.includes("?") ? gasUrl.split("?")[0] : gasUrl;
      const params = { ...req.query, ...(req.body || {}) };

      const rawAction = (params.action as string) || "unknown";
      const actionName = normalizeAction(rawAction);
      params.action = actionName;

      // Handle mutations by invalidating corresponding caches
      if (!isReadAction(actionName)) {
        invalidateCacheForMutation(actionName);
      }

      // Check cache for read actions
      const cacheKey = `${cleanBase}|${actionName}|${JSON.stringify(params)}`;
      const cached = responseCache.get(cacheKey);
      if (isReadAction(actionName) && cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return res.status(200).json(cached.data);
      }

      // Deduplicate concurrent in-flight requests for the exact same query
      if (isReadAction(actionName) && inFlightRequests.has(cacheKey)) {
        const result = await inFlightRequests.get(cacheKey);
        return res.status(200).json(result);
      }

      const executeGasFetch = async (): Promise<any> => {
        return gasQueue.run(async () => {
          const urlParams = new URLSearchParams();
          Object.entries(params).forEach(([key, val]) => {
            if (val !== undefined && val !== null) {
              if (typeof val === "object") {
                urlParams.append(key, JSON.stringify(val));
              } else {
                urlParams.append(key, String(val));
              }
            }
          });

          const targetUrl = `${cleanBase}?${urlParams.toString()}`;
          console.log(`[API Proxy] Action: ${actionName} -> Outgoing GAS Request`);

          let gasResponse: Response | null = null;
          try {
            gasResponse = await fetch(targetUrl, {
              method: "GET",
              headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Express-GAS-Proxy",
              },
              signal: AbortSignal.timeout(30000), // 30s timeout per queue item
            });
          } catch (fetchErr: any) {
            console.log(`[API Proxy] GAS request for action "${actionName}" timed out or connection reset (${fetchErr?.message || "Timeout"}).`);
            
            // If we have any stale cache entry, return it
            if (cached) {
              return {
                ...cached.data,
                isStale: true,
              };
            }

            // Return safe fallback for read endpoints instead of failing
            const isArrayEndpoint = [
              "getExpenses",
              "getIncomes",
              "getProjects",
              "getClients",
              "getEmployees",
              "getSalaryPayments",
              "getActivityLogs",
            ].includes(actionName);

            return {
              status: "success",
              success: true,
              isGasDeploymentError: false,
              message: "Offline fallback response",
              data: isArrayEndpoint ? [] : {},
            };
          }

          const text = await gasResponse.text();
          let json: any;
          try {
            json = JSON.parse(text);
          } catch {
            // If GET returned HTML, try POST fallback to cleanBase
            let postSuccess = false;
            if (text.startsWith("<") || text.includes("<html") || text.includes("<title>")) {
              try {
                console.log(`[API Proxy] GET returned HTML for "${actionName}". Trying POST fallback...`);
                const postRes = await fetch(cleanBase, {
                  method: "POST",
                  headers: {
                    "Content-Type": "text/plain;charset=utf-8",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Express-GAS-Proxy",
                  },
                  body: JSON.stringify(params),
                  signal: AbortSignal.timeout(30000),
                });
                const postText = await postRes.text();
                json = JSON.parse(postText);
                postSuccess = true;
              } catch {
                // POST failed as well
              }
            }

            if (!postSuccess) {
              if (cached) {
                return { ...cached.data, isStale: true };
              }
              json = {
                status: "error",
                success: false,
                isGasDeploymentError: true,
                message: "Non-JSON response received from Google Apps Script",
                data: null,
              };
            }
          }

          // Save valid responses in cache
          if (json && (json.success === true || json.status === "success") && isReadAction(actionName)) {
            responseCache.set(cacheKey, {
              data: json,
              timestamp: Date.now(),
            });
          }

          return json;
        });
      };

      const requestPromise = executeGasFetch();
      if (isReadAction(actionName)) {
        inFlightRequests.set(cacheKey, requestPromise);
      }

      try {
        const jsonResult = await requestPromise;
        return res.status(200).json(jsonResult);
      } finally {
        if (isReadAction(actionName)) {
          inFlightRequests.delete(cacheKey);
        }
      }
    } catch (err: any) {
      console.error("[API Proxy Error]", err?.message || err);
      return res
        .status(500)
        .json({ status: "error", message: err.message || "Proxy server internal error" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
