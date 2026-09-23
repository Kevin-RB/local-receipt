import type { AcceptedMimeType } from "./constants";

const MIME_TO_EXT = {
  "image/jpeg": "jpg",
  "image/png": "png",
} as const satisfies Record<AcceptedMimeType, string>;

const EXT_TO_MIME = {
  jpg: "image/jpeg",
  png: "image/png",
} as const;

export const extensionForMime = (mime: AcceptedMimeType): string =>
  MIME_TO_EXT[mime];

export const contentTypeFromKey = (key: string): string => {
  const ext = key.split(".").pop();
  return ext && ext in EXT_TO_MIME
    ? EXT_TO_MIME[ext as keyof typeof EXT_TO_MIME]
    : "image/jpeg";
};
