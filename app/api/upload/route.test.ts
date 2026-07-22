import { describe, it, expect, vi } from "vitest";

const mockInsertValues = vi.fn<() => void>();
const mockInsert = vi
  .fn<() => { values: typeof mockInsertValues }>()
  .mockReturnValue({ values: mockInsertValues });

// @ts-expect-error mock types don't need to match Drizzle internals
vi.mock(import("@/lib/db"), () => ({
  db: { insert: mockInsert },
  receipts: {},
}));

vi.mock(import("@/lib/minio/client"), () => ({
  ACCEPTED_MIME_TYPES: ["image/jpeg", "image/png"] as const,
  BUCKET: "receipts",
  createPresignedUrl: vi
    .fn<() => Promise<string>>()
    .mockResolvedValue("http://minio:9000/receipts/abc.jpg?signature=xyz"),
  extensionForMime: vi
    .fn<(mime: string) => string>()
    .mockImplementation((mime: string) =>
      mime === "image/jpeg" ? "jpg" : "png"
    ),
}));

// @ts-expect-error mock types don't need to match Drizzle internals
vi.mock(import("node:crypto"), () => ({
  randomUUID: vi
    .fn<() => string>()
    .mockReturnValue("00000000-0000-0000-0000-000000000001"),
}));

const { POST } = await import("./route");

describe("POST /api/upload", () => {
  it("rejects non-JPEG/PNG content types", async () => {
    const res = await POST(
      new Request("http://localhost/api/upload", {
        body: JSON.stringify({
          contentType: "image/gif",
          fileSize: 1000,
        }),
        method: "POST",
      })
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("JPEG");
  });

  it("rejects invalid JSON body", async () => {
    const res = await POST(
      new Request("http://localhost/api/upload", {
        body: "not-json",
        method: "POST",
      })
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid request body");
  });

  it("rejects files over 5 MB", async () => {
    const res = await POST(
      new Request("http://localhost/api/upload", {
        body: JSON.stringify({
          contentType: "image/jpeg",
          fileSize: 10 * 1024 * 1024,
        }),
        method: "POST",
      })
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("5 MB");
  });

  it("rejects zero or negative file sizes", async () => {
    const res = await POST(
      new Request("http://localhost/api/upload", {
        body: JSON.stringify({
          contentType: "image/jpeg",
          fileSize: 0,
        }),
        method: "POST",
      })
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid file size");
  });

  it("accepts a valid JPEG upload request", async () => {
    const res = await POST(
      new Request("http://localhost/api/upload", {
        body: JSON.stringify({
          contentType: "image/jpeg",
          fileSize: 100_000,
        }),
        method: "POST",
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("receiptId");
    expect(body).toHaveProperty("uploadUrl");
  });
});
