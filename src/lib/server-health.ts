export type ServerHealthStatus = "online" | "degraded" | "offline";

export interface SuperAppsEnvironment {
  key: string;
  label: string;
  url: string;
}

export interface ServerHealthResult {
  key: string;
  label: string;
  url: string;
  status: ServerHealthStatus;
  statusCode: number | null;
  responseTimeMs: number | null;
  checkedAt: string;
  message?: string;
}

export const SUPERAPPS_ENVIRONMENTS: SuperAppsEnvironment[] = [
  {
    key: "development",
    label: "Development",
    url: "https://superapps-fe-dev.kemenkum.go.id",
  },
  {
    key: "staging",
    label: "Staging",
    url: "https://pasti-stg.kemenkum.go.id",
  },
  {
    key: "production",
    label: "Production",
    url: "https://pasti.kemenkum.go.id/",
  },
];

const DEFAULT_TIMEOUT_MS = 12_000;

async function fetchWithTimeout(
  url: string,
  method: "HEAD" | "GET",
  signal: AbortSignal
) {
  return fetch(url, {
    method,
    signal,
    redirect: "follow",
    cache: "no-store",
    headers: {
      "User-Agent": "SuperApps-Monitor/1.0 (health-check)",
      Accept: "text/html,application/xhtml+xml",
    },
  });
}

export async function checkServerHealth(
  env: SuperAppsEnvironment,
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<ServerHealthResult> {
  const checkedAt = new Date().toISOString();
  const start = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let response: Response;
    try {
      response = await fetchWithTimeout(env.url, "HEAD", controller.signal);
      if (response.status === 405 || response.status === 501) {
        response = await fetchWithTimeout(env.url, "GET", controller.signal);
      }
    } catch {
      response = await fetchWithTimeout(env.url, "GET", controller.signal);
    }

    const responseTimeMs = Date.now() - start;
    const statusCode = response.status;

    let status: ServerHealthStatus;
    if (response.ok) {
      status = "online";
    } else if (statusCode >= 500) {
      status = "offline";
    } else {
      status = "degraded";
    }

    return {
      key: env.key,
      label: env.label,
      url: env.url,
      status,
      statusCode,
      responseTimeMs,
      checkedAt,
      message:
        status === "online"
          ? "Server merespons normal"
          : `HTTP ${statusCode}`,
    };
  } catch (error) {
    const message =
      error instanceof Error && error.name === "AbortError"
        ? "Timeout — server tidak merespons"
        : error instanceof Error
          ? error.message
          : "Gagal menghubungi server";

    return {
      key: env.key,
      label: env.label,
      url: env.url,
      status: "offline",
      statusCode: null,
      responseTimeMs: null,
      checkedAt,
      message,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function checkAllServerHealth(): Promise<ServerHealthResult[]> {
  return Promise.all(SUPERAPPS_ENVIRONMENTS.map((env) => checkServerHealth(env)));
}
