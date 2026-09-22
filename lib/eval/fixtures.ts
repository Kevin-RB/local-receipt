import { createHash } from "node:crypto";

export interface HashedImage {
  hash: string;
  path: string;
}

/** Content hash that identifies a fixture and collapses byte-identical images. */
export const fixtureId = (bytes: Uint8Array): string =>
  createHash("sha256").update(bytes).digest("hex");

export interface DedupeResult {
  duplicates: HashedImage[];
  unique: HashedImage[];
}

/**
 * Splits hashed images into the first occurrence of each content hash and the
 * byte-identical duplicates that follow it.
 */
export const dedupeByHash = (images: HashedImage[]): DedupeResult => {
  const unique = new Map<string, HashedImage>();
  const duplicates: HashedImage[] = [];

  for (const image of images) {
    if (unique.has(image.hash)) {
      duplicates.push(image);
    } else {
      unique.set(image.hash, image);
    }
  }

  return { duplicates, unique: [...unique.values()] };
};
