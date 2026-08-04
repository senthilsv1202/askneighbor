// Phone screenshots are typically 2-4 MB and far larger than needed: Claude scales
// anything over ~1568px on the long edge down anyway. Shrinking here keeps the
// upload quick on mobile data and the request well inside the body limit.
const MAX_EDGE = 1400;
const QUALITY = 0.85;

// Event photos are looked at, not read, so they can take a little more resolution
// than a screenshot being parsed for text. At ~300KB each roughly 3,000 fit in
// Supabase's free tier, which is years of albums for one community.
export const PHOTO_OPTS = { maxEdge: 1600, quality: 0.8 };

export function downscaleToBase64(file, opts = {}) {
  const maxEdge = opts.maxEdge || MAX_EDGE;
  const quality = opts.quality || QUALITY;
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);

      const ctx = canvas.getContext('2d');
      // Screenshots are mostly text, so keep the resample as sharp as possible.
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      resolve({
        base64: dataUrl.split(',')[1],
        media_type: 'image/jpeg',
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('That file could not be read as an image.'));
    };

    img.src = url;
  });
}
