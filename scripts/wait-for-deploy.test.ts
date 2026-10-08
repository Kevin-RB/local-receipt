import { describe, expect, it } from "vitest";

import { classifyDeployment } from "./wait-for-deploy";
import type { Deployment } from "./wait-for-deploy";

const deployment = (overrides: Partial<Deployment> = {}): Deployment => ({
  commit: "abc123",
  status: "finished",
  ...overrides,
});

describe(classifyDeployment, () => {
  it("waits when the commit has no deployment yet", () => {
    expect(classifyDeployment([], "abc123")).toStrictEqual({ state: "wait" });
  });

  it("waits while the commit's deployment is still running", () => {
    const running = deployment({ status: "in_progress" });

    expect(classifyDeployment([running], "abc123")).toStrictEqual({
      deployment: running,
      state: "wait",
    });
  });

  it("succeeds when the commit's deployment finished", () => {
    const finished = deployment();

    expect(classifyDeployment([finished], "abc123")).toStrictEqual({
      deployment: finished,
      state: "success",
    });
  });

  it("fails when the commit's deployment failed", () => {
    const failed = deployment({ status: "failed" });

    expect(classifyDeployment([failed], "abc123")).toStrictEqual({
      deployment: failed,
      state: "failed",
    });
  });

  it("fails when the commit's deployment was cancelled", () => {
    const cancelled = deployment({ status: "cancelled" });

    expect(classifyDeployment([cancelled], "abc123")).toStrictEqual({
      deployment: cancelled,
      state: "failed",
    });
  });

  it("ignores deployments for other commits", () => {
    const other = deployment({ commit: "other" });

    expect(classifyDeployment([other], "abc123")).toStrictEqual({
      state: "wait",
    });
  });
});
