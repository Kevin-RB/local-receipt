import { tool, ToolLoopAgent } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { MAX_STEPS } from "./agent";

/**
 * The non-model half of the chat contract: once the SDK has a tool call, it
 * executes the tool, feeds the result back in a second model call, and returns
 * only the final text. Pinning that here means a prompt or model swap can be
 * judged on tool choice alone — the loop around it is not in question.
 */

const usage = {
  inputTokens: { cacheRead: 0, cacheWrite: 0, noCache: 1, total: 1 },
  outputTokens: { reasoning: 0, text: 1, total: 1 },
};

const toolCall = (input: unknown) => ({
  content: [
    {
      input: JSON.stringify(input),
      toolCallId: "call-1",
      toolName: "lookup",
      type: "tool-call" as const,
    },
  ],
  finishReason: { raw: undefined, unified: "tool-calls" as const },
  usage,
  warnings: [],
});

const answer = (text: string) => ({
  content: [{ text, type: "text" as const }],
  finishReason: { raw: undefined, unified: "stop" as const },
  usage,
  warnings: [],
});

const buildAgent = (model: MockLanguageModelV4, execute: () => unknown) =>
  new ToolLoopAgent({
    instructions: "Use the lookup tool.",
    model,
    stopWhen: ({ steps }) => steps.length >= MAX_STEPS,
    tools: {
      lookup: tool({
        description: "Look a value up.",
        execute,
        inputSchema: z.object({ query: z.string() }),
      }),
    },
  });

describe("chat agent loop", () => {
  it("executes a tool call, feeds the result back, and returns the final text", async () => {
    const model = new MockLanguageModelV4({
      doGenerate: [toolCall({ query: "cheese" }), answer("Found it.")],
      modelId: "mock",
      provider: "mock",
    });
    const execute = vi.fn<() => { answer: number }>(() => ({ answer: 42 }));
    const agent = buildAgent(model, execute);

    const result = await agent.generate({ prompt: "Find cheese" });

    expect(execute).toHaveBeenCalledWith(
      { query: "cheese" },
      expect.anything()
    );
    expect(result.text).toBe("Found it.");
    expect(result.steps).toHaveLength(2);
    expect(result.steps[0].toolResults[0].output).toStrictEqual({ answer: 42 });

    // The second model call must carry the tool result, not just the question.
    const secondPrompt = JSON.stringify(model.doGenerateCalls[1].prompt);
    expect(secondPrompt).toMatch(/"tool-result"[\s\S]*"answer":42/u);
  });

  it("stops at MAX_STEPS when the model keeps calling tools", async () => {
    const model = new MockLanguageModelV4({
      doGenerate: toolCall({ query: "cheese" }),
      modelId: "mock",
      provider: "mock",
    });
    const agent = buildAgent(model, () => ({ answer: 42 }));

    const result = await agent.generate({ prompt: "Find cheese" });

    expect(result.steps).toHaveLength(MAX_STEPS);
    expect(model.doGenerateCalls).toHaveLength(MAX_STEPS);
    expect(result.text).toBe("");
  });
});
