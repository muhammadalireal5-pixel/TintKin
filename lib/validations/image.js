export const ALLOWED_IMAGE_MIME_TYPES = Object.freeze([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

export const MAX_IMAGE_FILE_SIZE = 8 * 1024 * 1024; // 8MB

/**
 * Validates an image file before upload.
 * @param {File|Blob|{ type?: string, size?: number }} file
 * @returns {{ isValid: boolean, error?: string }}
 */
export function validateImageFile(file) {
  if (!file) {
    return { isValid: false, error: 'No file provided.' };
  }

  if (file.type && !ALLOWED_IMAGE_MIME_TYPES.includes(file.type)) {
    return {
      isValid: false,
      error: 'Only JPEG, PNG, and WebP images are supported.',
    };
  }

  if (file.size && file.size > MAX_IMAGE_FILE_SIZE) {
    return {
      isValid: false,
      error: 'Image file exceeds 8MB limit.',
    };
  }

  return { isValid: true };
}
