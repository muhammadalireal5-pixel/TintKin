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

// Delivery types we ever store. "upload" is the legacy, publicly-servable
// type every image predates the M22 fix with; "authenticated" (new uploads,
// and anything migrated by migrateImagesToAuthenticated) requires a valid
// signature to serve at all. Both must parse so reads/deletes keep working
// for images uploaded before the switch.
const DELIVERY_TYPES = ["authenticated", "upload"];

/**
 * Splits a Cloudinary delivery URL into its delivery type and everything
 * after `/image/<type>/` (transformations, version, signature, public_id).
 * Delivery-type-agnostic replacement for the old hardcoded "/upload/" split.
 * @param {string} imageUrl
 * @returns {{deliveryType: string, base: string, rest: string}|null}
 */
export function parseCloudinaryUrl(imageUrl) {
  if (!imageUrl || typeof imageUrl !== "string" || !imageUrl.includes("cloudinary.com")) return null;
  for (const type of DELIVERY_TYPES) {
    const marker = `/image/${type}/`;
    const idx = imageUrl.indexOf(marker);
    if (idx !== -1) {
      return {
        deliveryType: type,
        base: imageUrl.slice(0, idx),
        rest: imageUrl.slice(idx + marker.length),
      };
    }
  }
  return null;
}

/**
 * The delivery type segment of a Cloudinary URL ("upload" or "authenticated"),
 * or null if it doesn't parse. Destroy/explicit Admin API calls must target
 * the asset's actual type, or they silently no-op against a type it isn't.
 * @param {string} url
 * @returns {string|null}
 */
export function getCloudinaryDeliveryType(url) {
  return parseCloudinaryUrl(url)?.deliveryType ?? null;
}

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
  if (hostname !== 'res.cloudinary.com' || !pathname.startsWith(`/${cloudName}/image/`)) return false;
  const parsed = parseCloudinaryUrl(url);
  if (!parsed) return false;
  const publicId = getCloudinaryPublicId(url);
  return Boolean(publicId && publicId.startsWith(getUserUploadPrefix(String(userId))));
}

/**
 * Extracts the Cloudinary public_id from a full asset URL.
 * @param {string} imageUrl
 * @returns {string|null}
 */
export function getCloudinaryPublicId(imageUrl) {
  const parsed = parseCloudinaryUrl(imageUrl);
  if (!parsed) return null;

  let segments = parsed.rest.split('/');
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
  const parsed = parseCloudinaryUrl(stripCloudinarySignature(url));
  if (!parsed) return '';
  const transformations = [];
  for (const segment of parsed.rest.split('/')) {
    if (segment.includes(',')) transformations.push(segment);
    else if (!/^v\d+$/.test(segment)) break;
  }
  return transformations.join('/');
}

export { generateSignedCloudinaryUrl, signCloudinaryUrl, applyFaceCropToCloudinary, deleteCloudinaryAsset } from './cloudinary-sign';

