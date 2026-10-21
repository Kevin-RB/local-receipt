import { z } from "zod";

import { LM_STUDIO_URL } from "./provider";

const modelsResponseSchema = z.object({
  data: z.array(z.object({ id: z.string() })),
});

/**
 * The two models one extraction run uses.
 *
 * They are a pair because the roles differ: the OCR model reads the image, the
 * parse model turns the transcript into the contract, and only the first needs
 * to be a vision model. Naming the pair keeps that split visible at every
 * boundary the models cross — the picker, the trigger's input, and the event the
 * run is started with.
 *
 * Ids are bounded rather than free text: they are checked against what the
 * provider reports before a run starts.
 */
export const extractionModelsSchema = z.object({
  ocr: z.string().min(1).max(200),
  parse: z.string().min(1).max(200),
});

export type ExtractionModels = z.infer<typeof extractionModelsSchema>;

/**
 * The models LM Studio currently has loaded.
 *
 * Re-processing lets the owner pick a stronger model than the one the
 * environment fixed, and the only honest list of choices is the one the
 * provider reports — an id from any other source would fail at request time
 * with an opaque provider error.
 *
 * An unreachable or unparseable provider yields no models rather than an
 * error: the picker degrades to whatever the environment configured instead of
 * making the whole receipts table unusable because LM Studio is down.
 */
export const listAvailableModels = async (): Promise<string[]> => {
  try {
    const response = await fetch(`${LM_STUDIO_URL}/models`);
    if (!response.ok) {
      return [];
    }

    const parsed = modelsResponseSchema.safeParse(await response.json());
    if (!parsed.success) {
      return [];
    }

    return [...new Set(parsed.data.data.map((model) => model.id))];
  } catch {
    return [];
  }
};
