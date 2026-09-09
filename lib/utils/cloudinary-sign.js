import crypto from "crypto";
import { getCloudinaryPublicId } from "./cloudinary";

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
  if (imageUrl.includes("/s--")) return imageUrl; // Already signed

  const publicId = getCloudinaryPublicId(imageUrl);
  if (!publicId) return imageUrl;

  const deliveryType = imageUrl.includes("/image/authenticated/") ? "authenticated" : "upload";
  return generateSignedCloudinaryUrl(publicId, transformation, deliveryType);
}
