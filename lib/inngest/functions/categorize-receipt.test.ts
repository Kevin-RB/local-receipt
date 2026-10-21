import { InngestTestEngine } from "@inngest/test";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { categorizeReceipt } from "./categorize-receipt";

const { mocks } = vi.hoisted(() => {
  const where = vi.fn<() => Promise<void>>().mockResolvedValue();
  const set = vi.fn<() => { where: typeof where }>(() => ({ where }));
  const update = vi.fn<() => { set: typeof set }>(() => ({ set }));
  const findFirst = vi.fn<() => Promise<unknown>>();
  const listCategoryOptions = vi.fn<() => Promise<unknown>>();
  const categorizeItems = vi.fn<() => Promise<(string | null)[]>>();

  return {
    mocks: {
      categorizeItems,
      findFirst,
      listCategoryOptions,
      set,
      update,
      where,
    },
  };
});

// @ts-expect-error mock types don't match Drizzle internals
vi.mock(import("@/lib/db"), () => ({
  db: {
    query: { receipts: { findFirst: mocks.findFirst } },
    update: mocks.update,
  },
  listCategoryOptions: mocks.listCategoryOptions,
  receipts: {},
}));

// @ts-expect-error mock types don't match Drizzle internals
vi.mock(import("@/lib/db/schema/receipt-item"), () => ({ receiptItems: {} }));

vi.mock(import("@/lib/ai/categorize"), () => ({
  categorizeItems: mocks.categorizeItems,
}));

const options = [
  {
    id: "cat-dairy",
    name: "Dairy & Eggs",
    parentName: "Groceries",
    slug: "dairy-eggs",
  },
  { id: "cat-other", name: "Other", parentName: null, slug: "other" },
];

const createEngine = () =>
  new InngestTestEngine({
    events: [
      {
        data: { receiptId: "receipt-1", userId: "user-1" },
        name: "receipt/extracted",
      },
    ],
    function: categorizeReceipt,
  });

describe("categorizeReceipt function", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listCategoryOptions.mockResolvedValue(options);
    mocks.findFirst.mockResolvedValue({
      receiptItems: [
        {
          categorySource: "ai",
          id: "item-1",
          kind: "product",
          name: "Milk 2L",
        },
        {
          categorySource: "ai",
          id: "item-2",
          kind: "product",
          name: "Bananas",
        },
      ],
    });
    mocks.categorizeItems.mockResolvedValue(["dairy-eggs", "other"]);
  });

  it("assigns a category to each line item and stamps the receipt", async () => {
    const { result } = await createEngine().execute();

    expect(result).toStrictEqual({ categorized: 2, receiptId: "receipt-1" });
    expect(mocks.categorizeItems).toHaveBeenCalledWith(
      [
        { id: "item-1", kind: "product", name: "Milk 2L" },
        { id: "item-2", kind: "product", name: "Bananas" },
      ],
      options
    );
    expect(mocks.update).toHaveBeenCalledTimes(3);
  });

  it("leaves a user-set category untouched", async () => {
    mocks.findFirst.mockResolvedValue({
      receiptItems: [
        {
          categorySource: "user",
          id: "item-1",
          kind: "product",
          name: "Milk 2L",
        },
        {
          categorySource: "ai",
          id: "item-2",
          kind: "product",
          name: "Bananas",
        },
      ],
    });
    mocks.categorizeItems.mockResolvedValue(["other"]);

    const { result } = await createEngine().execute();

    expect(result).toStrictEqual({ categorized: 1, receiptId: "receipt-1" });
    expect(mocks.categorizeItems).toHaveBeenCalledWith(
      [{ id: "item-2", kind: "product", name: "Bananas" }],
      options
    );
  });

  it("does not run the model when every category was set by a user", async () => {
    mocks.findFirst.mockResolvedValue({
      receiptItems: [
        {
          categorySource: "user",
          id: "item-1",
          kind: "product",
          name: "Milk 2L",
        },
      ],
    });

    const { result } = await createEngine().execute();

    expect(result).toStrictEqual({ categorized: 0, receiptId: "receipt-1" });
    expect(mocks.categorizeItems).not.toHaveBeenCalled();
    expect(mocks.update).toHaveBeenCalledOnce();
  });

  it("fails when the receipt is missing", async () => {
    mocks.findFirst.mockResolvedValue(null);

    const { error } = await createEngine().execute();

    expect(error).toBeDefined();
    expect(mocks.categorizeItems).not.toHaveBeenCalled();
  });

  it("stamps a receipt with no line items without categorizing", async () => {
    mocks.findFirst.mockResolvedValue({ receiptItems: [] });

    const { result } = await createEngine().execute();

    expect(result).toStrictEqual({ categorized: 0, receiptId: "receipt-1" });
    expect(mocks.categorizeItems).not.toHaveBeenCalled();
    expect(mocks.update).toHaveBeenCalledOnce();
  });
});
