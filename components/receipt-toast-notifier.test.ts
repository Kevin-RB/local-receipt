import { describe, expect, it } from "vitest";

import { resolveToastBody } from "@/components/receipt-toast-notifier";
import type { ReceiptState } from "@/lib/inngest/channels";

const connectionError = () => new Error("socket closed");

const body = (input: {
  error?: Error | null;
  state?: ReceiptState;
  stateError?: string;
}) =>
  resolveToastBody({
    connectionStatus: "open",
    error: input.error ?? null,
    state: input.state,
    stateError: input.stateError,
  });

describe(resolveToastBody, () => {
  it("does not replace a done toast with a socket error", () => {
    // A drop inside the success toast's 10s window must not hide the outcome.
    expect(body({ error: connectionError(), state: "done" })).toStrictEqual({
      description: "You can now have look at your receipt data",
      timeout: 10_000,
      title: "Done!",
      type: "success",
    });
  });

  it("does not replace a failed toast with a socket error", () => {
    expect(
      body({ error: connectionError(), state: "failed", stateError: "OOM" })
    ).toStrictEqual({
      description: "OOM",
      timeout: 0,
      title: "Processing failed",
      type: "error",
    });
  });

  it("reports a socket error while no outcome is known", () => {
    expect(body({ error: connectionError() })).toStrictEqual({
      description: "socket closed",
      timeout: 0,
      title: "Connection error",
      type: "error",
    });
  });

  it("reports a socket error while a run is mid-flight", () => {
    expect(body({ error: connectionError(), state: "parsing" })).toStrictEqual({
      description: "socket closed",
      timeout: 0,
      title: "Connection error",
      type: "error",
    });
  });

  it("falls back to the connection state once the outcome is known", () => {
    expect(body({ state: "done" }).type).toBe("success");
    expect(body({}).description).toBe("Connected");
    expect(body({}).title).toBe("Upload complete");
  });
});
