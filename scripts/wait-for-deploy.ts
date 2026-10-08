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
 * Exits 0 once the commit's deployment is `finished`; exits non-zero if it
 * fails, is cancelled, or does not finish within the timeout.
 */

const FAILED_STATUSES = new Set(["failed", "cancelled", "cancelled_by_user"]);

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

const required = (name: string): string => {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable ${name}`);
  }

  return value;
};

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
    throw new Error(
      `Coolify API returned ${response.status}: ${await response.text()}`
    );
  }

  const body = (await response.json()) as { deployments?: Deployment[] };

  return body.deployments ?? [];
};

const main = async (): Promise<void> => {
  const commit = required("COMMIT");
  const timeoutMs = Number(process.env.TIMEOUT_SECONDS ?? "900") * 1000;
  const intervalMs = Number(process.env.POLL_INTERVAL_SECONDS ?? "15") * 1000;
  const deadline = Date.now() + timeoutMs;

  for (;;) {
    // Sequential by design: each poll must observe the previous result, so
    // there is nothing to parallelize here.
    // eslint-disable-next-line no-await-in-loop -- polling is inherently sequential
    const deployments = await fetchDeployments();
    const verdict = classifyDeployment(deployments, commit);

    if (verdict.state === "success") {
      console.log(`Deployment of ${commit} finished.`);
      return;
    }
    if (verdict.state === "failed") {
      throw new Error(`Deployment of ${commit} ${verdict.deployment.status}.`);
    }
    if (Date.now() >= deadline) {
      const last = verdict.deployment?.status ?? "not seen";
      throw new Error(
        `Timed out waiting for deployment of ${commit} (last status: ${last}).`
      );
    }

    console.log(
      `Waiting for deployment of ${commit} (${verdict.deployment?.status ?? "not seen"})...`
    );
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
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
