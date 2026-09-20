export const MAX_LONG_EDGE = 2000;
export const JPEG_QUALITY = 0.8;

export interface ImageSize {
  height: number;
  width: number;
}

export const fitWithinMaxEdge = ({ height, width }: ImageSize): ImageSize => {
  const longestEdge = Math.max(width, height);

  if (longestEdge <= MAX_LONG_EDGE) {
    return { height, width };
  }

  const scale = MAX_LONG_EDGE / longestEdge;

  return {
    height: Math.max(1, Math.round(height * scale)),
    width: Math.max(1, Math.round(width * scale)),
  };
};

const decodeImage = (file: File): Promise<ImageBitmap> =>
  // `from-image` bakes in the EXIF orientation so phone photos are not
  // sideways after re-encoding.
  createImageBitmap(file, { imageOrientation: "from-image" });

const encodeJpeg = (image: ImageBitmap, size: ImageSize): Promise<Blob> => {
  if (typeof OffscreenCanvas !== "undefined") {
    const canvas = new OffscreenCanvas(size.width, size.height);
    const context = canvas.getContext("2d");

    if (context) {
      context.drawImage(image, 0, 0, size.width, size.height);
      return canvas.convertToBlob({
        quality: JPEG_QUALITY,
        type: "image/jpeg",
      });
    }
  }

  const canvas = document.createElement("canvas");
  canvas.height = size.height;
  canvas.width = size.width;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas 2D context is unavailable");
  }

  context.drawImage(image, 0, 0, size.width, size.height);

  // eslint-disable-next-line promise/avoid-new -- canvas.toBlob is callback-only; OffscreenCanvas above is the primary path
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Could not encode image")),
      "image/jpeg",
      JPEG_QUALITY
    );
  });
};

export const compressReceiptImage = async (file: File): Promise<File> => {
  const image = await decodeImage(file);

  try {
    const size = fitWithinMaxEdge({
      height: image.height,
      width: image.width,
    });
    const blob = await encodeJpeg(image, size);
    return new File([blob], "receipt.jpg", { type: "image/jpeg" });
  } finally {
    image.close();
  }
};
