import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { dedupeByHash, fixtureId } from "@/lib/eval/fixtures";
import { goldenSchema } from "@/lib/eval/golden";
import type { FixtureGolden } from "@/lib/eval/golden";

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png"]);

export const loadGoldens = async ({
  fixtures,
  only,
}: {
  fixtures: string;
  only: string[];
}): Promise<FixtureGolden[]> => {
  const goldenDir = path.join(fixtures, "golden");
  let files: string[];
  try {
    files = await readdir(goldenDir);
  } catch {
    throw new Error(
      `No golden directory at ${goldenDir}. Add goldens there (see scripts/eval/README.md).`
    );
  }

  const loaded = await Promise.all(
    files
      .filter((entry) => entry.endsWith(".json"))
      .toSorted()
      .map(async (file) => {
        const raw: unknown = JSON.parse(
          await readFile(path.join(goldenDir, file), "utf-8")
        );
        const parsed = goldenSchema.safeParse(raw);
        if (!parsed.success) {
          throw new Error(
            `${file} is not a valid golden: ${parsed.error.message}`
          );
        }
        return parsed.data;
      })
  );

  const selected =
    only.length === 0
      ? loaded
      : loaded.filter((golden) => only.includes(golden.id));

  if (selected.length === 0) {
    throw new Error(
      "No fixtures selected. Check --fixture and the golden dir."
    );
  }

  const { duplicates, unique } = dedupeByHash(
    selected.map((golden) => ({ hash: golden.id, path: golden.image }))
  );
  for (const duplicate of duplicates) {
    console.warn(
      `warning: duplicate fixture ${duplicate.path} shares hash ${duplicate.hash}`
    );
  }

  const uniqueIds = new Set(unique.map((image) => image.hash));
  return selected.filter((golden) => uniqueIds.has(golden.id));
};

export const readFixtureImage = async (golden: FixtureGolden, root: string) => {
  const bytes = await readFile(path.join(root, golden.image));
  const hash = fixtureId(bytes);
  if (hash !== golden.id) {
    throw new Error(
      `Fixture ${golden.id} (${golden.image}) hashes to ${hash}; fix the golden id.`
    );
  }
  return bytes;
};

export const indexSource = async (source: string, root: string) => {
  const entries = await readdir(source);
  const files = entries.filter((file) =>
    IMAGE_EXTENSIONS.has(path.extname(file).toLowerCase())
  );
  const hashed = await Promise.all(
    files.map(async (file) => ({
      hash: fixtureId(await readFile(path.join(source, file))),
      path: file,
    }))
  );
  const { duplicates, unique } = dedupeByHash(hashed);

  const receiptsDir = path.join(root, "receipts");
  await mkdir(receiptsDir, { recursive: true });
  await Promise.all(
    unique.map(async (image) => {
      const bytes = await readFile(path.join(source, image.path));
      const extension = path.extname(image.path).toLowerCase();
      await writeFile(
        path.join(receiptsDir, `${image.hash}${extension}`),
        bytes
      );
    })
  );

  console.log(`Indexed ${unique.length} unique receipts into ${receiptsDir}.`);
  for (const image of unique) {
    console.log(`  ${image.hash}  <- ${image.path}`);
  }
  for (const duplicate of duplicates) {
    console.log(`  skipped duplicate: ${duplicate.path} (${duplicate.hash})`);
  }
};
