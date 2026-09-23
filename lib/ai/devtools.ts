import { DevToolsTelemetry } from "@ai-sdk/devtools";
import { registerTelemetry } from "ai";

/**
 * Captures every AI SDK call (requests, responses, token usage) into
 * `.devtools/generations.json`, viewed with `npx @ai-sdk/devtools@latest`.
 *
 * Local development only — callers must skip this in production.
 */
export const registerAiDevTools = () => {
  registerTelemetry(DevToolsTelemetry());
};
