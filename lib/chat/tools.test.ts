import { readFileSync } from "node:fs";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildChatTools } from "./tools/index";

const mocks = vi.hoisted(() => ({
  listReceiptSummaries: vi.fn<() => Promise<unknown>>(),
  receiptDetail: vi.fn<() => Promise<unknown>>(),
  searchLineItems: vi.fn<() => Promise<unknown>>(),
  spendByCategory: vi.fn<() => Promise<unknown>>(),
  spendByMerchant: vi.fn<() => Promise<unknown>>(),
}));

// The queries hit Postgres, so they are stubbed. Only the arguments matter
// here — these tests assert on owner scoping, not on results.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- `vi.mock` cannot preserve per-function generics
vi.mock(import("./queries"), () => mocks as any);

const OWNER = "user-1";

/**
 * The read tools close over `ownerId` server-side. These tests pin that: the
 * model never supplies an owner, so if a tool ever took one as an argument, a
 * prompt injection hidden in a receipt transcript could reach another user's
 * data.
 */
describe("owner scoping", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("binds the owner into list_receipts", async () => {
    await buildChatTools(OWNER).list_receipts.execute?.(
      { from: "2026-08-01", merchant: "Woolworths", to: "2026-08-31" },
      {} as never
    );

    expect(mocks.listReceiptSummaries).toHaveBeenCalledWith(OWNER, {
      from: "2026-08-01",
      merchant: "Woolworths",
      to: "2026-08-31",
    });
  });

  it("binds the owner into search_line_items", async () => {
    await buildChatTools(OWNER).search_line_items.execute?.(
      { query: "cheese" },
      {} as never
    );

    expect(mocks.searchLineItems).toHaveBeenCalledWith(OWNER, {
      query: "cheese",
    });
  });

  it("does not accept an owner argument on any tool", () => {
    for (const [name, tool] of Object.entries(buildChatTools(OWNER))) {
      const properties = Object.keys(
        (tool.inputSchema as { shape?: object }).shape ?? {}
      );
      expect(properties, `${name} input`).not.toContain("ownerId");
      expect(properties, `${name} input`).not.toContain("userId");
    }
  });
});

describe("tool/UI coverage", () => {
  // Renaming a tool is a deliberate edit here rather than a silent change in
  // what the model can call. A tool added without a `case` in
  // `chat-message.tsx` is already a build error — see `unreachableToolPart`.
  it("exposes exactly the six agreed tools", () => {
    expect(Object.keys(buildChatTools(OWNER)).toSorted()).toStrictEqual([
      "ask_user",
      "list_receipts",
      "receipt_detail",
      "search_line_items",
      "spend_by_category",
      "spend_by_merchant",
    ]);
  });

  it("declares an input and output schema for every tool", () => {
    for (const [name, tool] of Object.entries(buildChatTools(OWNER))) {
      expect(tool.inputSchema, `${name} inputSchema`).toBeDefined();
      expect(tool.outputSchema, `${name} outputSchema`).toBeDefined();
    }
  });

  it("leaves ask_user for the client to complete", () => {
    // No `execute` is the whole mechanism: the UI supplies the output via
    // `addToolOutput`, so defining one would make the tool server-only and
    // break the `sendAutomaticallyWhen` resume path.
    expect(buildChatTools(OWNER).ask_user.execute).toBeUndefined();
  });

  it("renders every tool in chat-message.tsx", () => {
    // `AssistantToolPart`'s `default` branch passes the unhandled part to a
    // `never` parameter, so TypeScript already rejects a missing case. This
    // asserts the same pairing at runtime, which also catches a `case` whose
    // label has drifted from the tool set.
    const source = readFileSync(
      new URL("../../components/chat/chat-message.tsx", import.meta.url),
      "utf-8"
    );
    const names = [...source.matchAll(/case "tool-(?<name>[a-z_]+)":/gu)].map(
      (match) => match.groups?.name ?? ""
    );

    expect(names.toSorted()).toStrictEqual(
      Object.keys(buildChatTools(OWNER)).toSorted()
    );
  });
});
