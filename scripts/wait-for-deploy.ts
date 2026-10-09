import { setTimeout as sleep } from "node:timers/promises";
import { pathToFileURL } from "node:url";

/**
 * Wait for the Coolify deployment of a specific commit to finish.
 *
 * Runs in the `sync-inngest` workflow, which must not tell Inngest to sync
 * until the new code is live: an early sync registers the previous function
 * manifest, which is the failure this exists to prevent. Coolify's API is the
 * authoritative source for "the deployment finished", so we poll it rather
 * than teach the app an endpoint that only CI needs.
 *
 * Two budgets, because "Coolify has not started" and "the build is still
 * running" are different problems: a missing deployment means the webhook or
 * the app id is wrong and should fail quickly, while a build may legitimately
 * take a long time. Exits 0 once the commit's deployment is `finished`; exits
 * non-zero if it fails, is cancelled, never appears, or does not finish in
 * time. Transient poll failures (network, Cloudflare Access 5xx) are retried
 * until the relevant deadline; a permanent one (bad token, wrong app id)
 * fails fast.
 */

// Coolify's terminal non-success statuses. `queued` and `in_progress` are the
// ones still worth waiting on; see `ApplicationDeploymentStatus` in Coolify.
const FAILED_STATUSES = new Set(["failed", "cancelled-by-user"]);

export interface Deployment {
  commit: string;
  status: string;
}

export type DeploymentVerdict =
  | { state: "failed"; deployment: Deployment }
  | { state: "success"; deployment: Deployment }
  | { state: "wait"; deployment?: Deployment };

/** Whether the commit's deployment is finished, broken, or still running. */
export const classifyDeployment = (
  deployments: Deployment[],
  commit: string
): DeploymentVerdict => {
  const deployment = deployments.find((entry) => entry.commit === commit);

  if (!deployment) {
    return { state: "wait" };
  }
  if (deployment.status === "finished") {
    return { deployment, state: "success" };
  }
  if (FAILED_STATUSES.has(deployment.status)) {
    return { deployment, state: "failed" };
  }
  return { deployment, state: "wait" };
};

/** A Coolify API response that is not OK, tagged with whether it can clear. */
export class CoolifyRequestError extends Error {
  readonly retryable: boolean;

  constructor(message: string, retryable: boolean) {
    super(message);
    this.name = "CoolifyRequestError";
    this.retryable = retryable;
  }
}

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/** A network failure or a retryable response is worth another poll. */
export const isRetryable = (error: unknown): boolean =>
  !(error instanceof CoolifyRequestError) || error.retryable;

const required = (name: string): string => {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable ${name}`);
  }

  return value;
};

const seconds = (milliseconds: number): number =>
  Math.round(milliseconds / 1000);

const fetchDeployments = async (): Promise<Deployment[]> => {
  const baseUrl = required("COOLIFY_URL").replace(/\/+$/u, "");
  const appUuid = required("APP_UUID");

  const headers: Record<string, string> = {
    Accept: "application/json",
    Authorization: `Bearer ${required("COOLIFY_API_KEY")}`,
  };
  // Present only in CI, where the Coolify API sits behind Cloudflare Access.
  const accessClientId = process.env.CF_ACCESS_CLIENT_ID;
  const accessClientSecret = process.env.CF_ACCESS_CLIENT_SECRET;

  if (accessClientId) {
    headers["CF-Access-Client-Id"] = accessClientId;
  }
  if (accessClientSecret) {
    headers["CF-Access-Client-Secret"] = accessClientSecret;
  }

  const response = await fetch(
    `${baseUrl}/api/v1/deployments/applications/${appUuid}?take=50`,
    { headers }
  );

  if (!response.ok) {
    // 408/429/5xx can clear on their own; a 4xx (401/403/404) will not.
    const retryable =
      response.status === 408 ||
      response.status === 429 ||
      response.status >= 500;
    throw new CoolifyRequestError(
      `Coolify API returned ${response.status}: ${await response.text()}`,
      retryable
    );
  }

  const body = (await response.json()) as { deployments?: Deployment[] };

  return body.deployments ?? [];
};

const main = async (): Promise<void> => {
  const commit = required("COMMIT");
  const finishTimeoutMs = Number(process.env.TIMEOUT_SECONDS ?? "1800") * 1000;
  const notFoundTimeoutMs =
    Number(process.env.NOT_FOUND_TIMEOUT_SECONDS ?? "300") * 1000;
  const intervalMs = Number(process.env.POLL_INTERVAL_SECONDS ?? "15") * 1000;
  const finishBy = Date.now() + finishTimeoutMs;
  const appearBy = Date.now() + notFoundTimeoutMs;

  for (;;) {
    let verdict: DeploymentVerdict | undefined;

    try {
      // Sequential by design: each poll must observe the previous result, so
      // there is nothing to parallelize here.
      // eslint-disable-next-line no-await-in-loop -- polling is inherently sequential
      verdict = classifyDeployment(await fetchDeployments(), commit);
    } catch (error: unknown) {
      // A transient failure must not end the wait on the first poll; a
      // permanent one should fail fast rather than burn the whole budget.
      if (!isRetryable(error)) {
        throw error;
      }
      console.warn(`Coolify poll failed (${errorMessage(error)}); retrying.`);
    }

    if (verdict?.state === "success") {
      console.log(`Deployment of ${commit} finished.`);
      return;
    }
    if (verdict?.state === "failed") {
      throw new Error(`Deployment of ${commit} ${verdict.deployment.status}.`);
    }

    if (verdict?.deployment) {
      // Coolify started a deployment; a slow build is allowed the full budget.
      if (Date.now() >= finishBy) {
        throw new Error(
          `Timed out waiting for deployment of ${commit} to finish (last status: ${verdict.deployment.status}).`
        );
      }
      console.log(
        `Waiting for deployment of ${commit} to finish (${verdict.deployment.status})...`
      );
    } else if (verdict) {
      // Reached Coolify, but it has not created a deployment for the commit.
      if (Date.now() >= appearBy) {
        throw new Error(
          `Coolify never started a deployment for ${commit} within ${seconds(notFoundTimeoutMs)}s.`
        );
      }
      console.log(`Waiting for Coolify to start a deployment for ${commit}...`);
    } else if (Date.now() >= finishBy) {
      // Never reached the API; bound the retries by the overall budget.
      throw new Error(
        `Could not reach the Coolify API for ${commit} within ${seconds(finishTimeoutMs)}s.`
      );
    }

    // eslint-disable-next-line no-await-in-loop -- polling is inherently sequential
    await sleep(intervalMs);
  }
};

const isMain =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  try {
    await main();
  } catch (error: unknown) {
    console.error(errorMessage(error));
    process.exitCode = 1;
  }
}
