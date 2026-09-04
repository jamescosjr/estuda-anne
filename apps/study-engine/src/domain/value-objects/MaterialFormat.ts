export type MaterialFormat = 'PDF' | 'PPT' | 'VIDEO' | 'AUDIO' | 'IMAGE';

export const VALID_MATERIAL_FORMATS: readonly MaterialFormat[] = ['PDF', 'PPT', 'VIDEO', 'AUDIO', 'IMAGE'] as const;

export const SUPPORTED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export function isValidMaterialFormat(value: string): value is MaterialFormat {
  return VALID_MATERIAL_FORMATS.includes(value as MaterialFormat);
}

export function isSupportedImageMimeType(mimeType: string): boolean {
  return SUPPORTED_IMAGE_MIME_TYPES.includes(mimeType as typeof SUPPORTED_IMAGE_MIME_TYPES[number]);
}
