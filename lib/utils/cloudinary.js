const ALLOWED_HOSTNAMES = Object.freeze([
  'res.cloudinary.com',
  'yce-us.s3-accelerate.amazonaws.com',
  'yce-us.s3.amazonaws.com',
  'tintkin.com',
]);

/**
 * Validates that an image URL comes from a trusted CDN/domain.
 * @param {string} url
 * @returns {boolean}
 */
export function validateTrustedImageUrl(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return false;
    return ALLOWED_HOSTNAMES.some(
      (host) => parsed.hostname === host || parsed.hostname.endsWith('.' + host)
    );
  } catch {
    return false;
  }
}

/**
 * Extracts the Cloudinary public_id from a full asset URL.
 * @param {string} imageUrl
 * @returns {string|null}
 */
export function getCloudinaryPublicId(imageUrl) {
  if (!imageUrl || !imageUrl.includes('cloudinary.com')) return null;
  const parts = imageUrl.split('/upload/');
  if (parts.length !== 2) return null;

  let segments = parts[1].split('/');
  while (segments.length > 1 && (segments[0].includes(',') || /^v\d+$/.test(segments[0]))) {
    segments.shift();
  }

  let pathPart = segments.join('/');
  const dotIndex = pathPart.lastIndexOf('.');
  return dotIndex !== -1 ? pathPart.substring(0, dotIndex) : pathPart;
}

/**
 * Applies a face-detecting centered thumbnail crop to a Cloudinary URL.
 * @param {string} url
 * @param {number} [zoom=1.05]
 * @returns {string}
 */
export function applyFaceCropToCloudinary(url, zoom = 1.05) {
  if (!url || !url.includes('cloudinary.com')) return url;
  const parts = url.split('/upload/');
  if (parts.length !== 2) return url;
  return `${parts[0]}/upload/c_thumb,g_face,z_${zoom},w_1200,h_1200/${parts[1]}`;
}

export { generateSignedCloudinaryUrl, signCloudinaryUrl } from './cloudinary-sign';

