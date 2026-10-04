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

// Cloudinary delivery signature path segment, e.g. "s--AbC123_---".
const SIGNATURE_SEGMENT = /^s--[A-Za-z0-9_-]{8}--$/;

/**
 * Public-id prefix every user upload is stored under. Binding uploads to their
 * owner lets the server reject client-supplied URLs for anyone else's images
 * (which it would otherwise analyze, store, or even delete).
 * @param {string} userId
 */
export function getUserUploadPrefix(userId) {
  return `users/${userId}/`;
}

/**
 * True only for a Cloudinary URL in this app's own cloud whose public_id sits
 * under the given user's upload prefix.
 * @param {string} url
 * @param {string} userId
 * @param {string} [cloudName=process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME]
 */
export function isOwnedUserUpload(url, userId, cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME) {
  if (!userId || !cloudName || !validateTrustedImageUrl(url)) return false;
  const { hostname, pathname } = new URL(url);
  if (hostname !== 'res.cloudinary.com' || !pathname.startsWith(`/${cloudName}/image/upload/`)) return false;
  const publicId = getCloudinaryPublicId(url);
  return Boolean(publicId && publicId.startsWith(getUserUploadPrefix(String(userId))));
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
  while (
    segments.length > 1 &&
    (segments[0].includes(',') || /^v\d+$/.test(segments[0]) || SIGNATURE_SEGMENT.test(segments[0]))
  ) {
    segments.shift();
  }

  let pathPart = segments.join('/');
  const dotIndex = pathPart.lastIndexOf('.');
  return dotIndex !== -1 ? pathPart.substring(0, dotIndex) : pathPart;
}

/**
 * Removes a delivery signature segment. A signature only covers the exact
 * transformation it was generated for, so it must be dropped before a URL's
 * transformations are changed (or recomputed afterwards).
 * @param {string} url
 * @returns {string}
 */
export function stripCloudinarySignature(url) {
  if (!url || typeof url !== 'string') return url;
  return url.replace(/\/s--[A-Za-z0-9_-]{8}--\//, '/');
}

/**
 * Returns the chained transformation segments of a Cloudinary URL
 * (e.g. "c_thumb,g_face,z_1.05,w_1200,h_1200"), joined by "/", or "".
 * @param {string} url
 * @returns {string}
 */
export function getCloudinaryTransformations(url) {
  if (!url || !url.includes('cloudinary.com')) return '';
  const parts = stripCloudinarySignature(url).split('/upload/');
  if (parts.length !== 2) return '';
  const transformations = [];
  for (const segment of parts[1].split('/')) {
    if (segment.includes(',')) transformations.push(segment);
    else if (!/^v\d+$/.test(segment)) break;
  }
  return transformations.join('/');
}

/**
 * Applies a face-detecting centered thumbnail crop to a Cloudinary URL.
 * Signed URLs are converted to unsigned ones first: inserting a transformation
 * in front of (or after) an existing signature yields a URL Cloudinary rejects.
 * Selfies are public `upload` assets, so the unsigned crop is deliverable.
 * @param {string} url
 * @param {number} [zoom=1.05]
 * @returns {string}
 */
export function applyFaceCropToCloudinary(url, zoom = 1.05) {
  if (!url || !url.includes('cloudinary.com')) return url;
  const parts = stripCloudinarySignature(url).split('/upload/');
  if (parts.length !== 2) return url;
  return `${parts[0]}/upload/c_thumb,g_face,z_${zoom},w_1200,h_1200/${parts[1]}`;
}

export { generateSignedCloudinaryUrl, signCloudinaryUrl } from './cloudinary-sign';

