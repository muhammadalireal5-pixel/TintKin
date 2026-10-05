import crypto from "crypto";
import { getCloudinaryPublicId, getCloudinaryTransformations, stripCloudinarySignature, parseCloudinaryUrl } from "./cloudinary";

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

/**
 * Generates an HMAC-SHA1 signature token for Cloudinary asset delivery.
 * Cloudinary signed URL signature is the first 8 characters of the base64-url
 * encoded SHA-1 hash of the string: `<transformations>/<public_id><api_secret>`
 *
 * @param {string} publicId - The public ID of the Cloudinary asset
 * @param {string} [transformation=""] - Optional transformation string (e.g. "c_thumb,g_face,w_1200,h_1200")
 * @param {string} [deliveryType="authenticated"] - "authenticated" or "upload"
 * @returns {string} Fully qualified signed Cloudinary URL
 */
export function generateSignedCloudinaryUrl(publicId, transformation = "", deliveryType = "authenticated") {
  const secret = process.env.CLOUDINARY_API_SECRET;
  if (!secret || !CLOUD_NAME || !publicId) {
    // If no secret configured, return standard public URL fallback
    return `https://res.cloudinary.com/${CLOUD_NAME || "demo"}/image/${deliveryType}/${publicId}`;
  }

  // Normalize transformation prefix
  const transformPart = transformation ? `${transformation.replace(/^\/|\/$/g, "")}/` : "";
  const toSign = `${transformPart}${publicId}${secret}`;
  
  // 8-character base64url signature used by Cloudinary
  const signature = crypto
    .createHash("sha1")
    .update(toSign)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .substring(0, 8);

  return `https://res.cloudinary.com/${CLOUD_NAME}/image/${deliveryType}/s--${signature}--/${transformPart}${publicId}`;
}

/**
 * Converts any existing raw Cloudinary URL to a signed authenticated delivery URL.
 *
 * @param {string} imageUrl
 * @param {string} [transformation=""]
 * @returns {string}
 */
export function signCloudinaryUrl(imageUrl, transformation = "") {
  if (!imageUrl || typeof imageUrl !== "string") return imageUrl;
  if (!imageUrl.includes("cloudinary.com")) return imageUrl;

  // Re-sign rather than trusting an existing signature: records saved before the
  // crop/signature ordering fix hold URLs whose signature doesn't cover their crop.
  const unsignedUrl = stripCloudinarySignature(imageUrl);
  const publicId = getCloudinaryPublicId(unsignedUrl);
  if (!publicId) return imageUrl;

  // Keep the URL's own transformations (e.g. the face crop on simulation
  // baselines) inside the signature, or the image loses its crop on re-sign.
  const fullTransformation = [getCloudinaryTransformations(unsignedUrl), transformation]
    .filter(Boolean)
    .join("/");

  const deliveryType = imageUrl.includes("/image/authenticated/") ? "authenticated" : "upload";
  return generateSignedCloudinaryUrl(publicId, fullTransformation, deliveryType);
}

/**
 * Applies a face-detecting centered thumbnail crop to a Cloudinary URL.
 * For a legacy `upload`-type asset the crop is returned unsigned (an
 * unsigned URL is still deliverable for that type, same as before M22).
 * For an `authenticated`-type asset, Cloudinary refuses to serve ANY
 * unsigned URL, so the cropped URL must be (re-)signed here to be usable
 * at all — this is the only caller of this function that doesn't already
 * go through signCloudinaryUrl before use (youcam.js fetches it directly).
 * @param {string} url
 * @param {number} [zoom=1.05]
 * @returns {string}
 */
export function applyFaceCropToCloudinary(url, zoom = 1.05) {
  const parsed = parseCloudinaryUrl(stripCloudinarySignature(url));
  if (!parsed) return url;
  const transformation = `c_thumb,g_face,z_${zoom},w_1200,h_1200`;
  if (parsed.deliveryType === "authenticated") {
    const publicId = getCloudinaryPublicId(url);
    return generateSignedCloudinaryUrl(publicId, transformation, "authenticated");
  }
  return `${parsed.base}/image/${parsed.deliveryType}/${transformation}/${parsed.rest}`;
}
