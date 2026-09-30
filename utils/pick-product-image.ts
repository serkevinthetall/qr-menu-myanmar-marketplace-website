/**
 * Pick and lightly compress a product photo for Odoo image_1920 (web ERP).
 */
export type PickedProductImage = {
  /** data: URL for local preview */
  previewUri: string;
  /** Raw base64 without data: prefix */
  base64: string;
};

const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.85;
const MAX_FILE_BYTES = 12 * 1024 * 1024;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Could not read the image file.'));
    reader.readAsDataURL(file);
  });
}

async function compressDataUrl(dataUrl: string): Promise<PickedProductImage> {
  if (typeof document === 'undefined') {
    const base64 = dataUrl.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/i, '');
    return { previewUri: dataUrl, base64 };
  }

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not decode the image.'));
    img.src = dataUrl;
  });

  const scale = Math.min(1, MAX_EDGE / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    const base64 = dataUrl.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/i, '');
    return { previewUri: dataUrl, base64 };
  }
  ctx.drawImage(image, 0, 0, width, height);
  const compressed = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
  const base64 = compressed.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/i, '');
  return { previewUri: compressed, base64 };
}

/**
 * Opens the native file picker (web) and returns a compressed JPEG base64 payload.
 */
export function pickProductImageFile(): Promise<PickedProductImage | null> {
  if (typeof document === 'undefined') {
    return Promise.reject(
      new Error('Image upload is available in the web ERP for now.'),
    );
  }

  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/webp,image/gif';
    input.style.display = 'none';
    document.body.appendChild(input);

    const cleanup = () => {
      input.remove();
    };

    input.onchange = () => {
      const file = input.files?.[0];
      cleanup();
      if (!file) {
        resolve(null);
        return;
      }
      if (file.size > MAX_FILE_BYTES) {
        reject(new Error('Choose an image smaller than 12 MB.'));
        return;
      }
      void readFileAsDataUrl(file)
        .then(compressDataUrl)
        .then(resolve)
        .catch(reject);
    };

    input.oncancel = () => {
      cleanup();
      resolve(null);
    };

    input.click();
  });
}
