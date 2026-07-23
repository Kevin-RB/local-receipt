export const ACCEPTED_MIME_TYPES = ["image/jpeg", "image/png"] as const;

export type AcceptedMimeType = (typeof ACCEPTED_MIME_TYPES)[number];

export const ACCEPTED_LABEL = "JPEG or PNG";
