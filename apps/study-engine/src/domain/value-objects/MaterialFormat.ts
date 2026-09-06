export type MaterialFormat = 'PDF' | 'PPT' | 'VIDEO' | 'AUDIO' | 'IMAGE';

export const VALID_MATERIAL_FORMATS: readonly MaterialFormat[] = ['PDF', 'PPT', 'VIDEO', 'AUDIO', 'IMAGE'] as const;

export const SUPPORTED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export function isValidMaterialFormat(value: string): value is MaterialFormat {
  return VALID_MATERIAL_FORMATS.includes(value as MaterialFormat);
}

export function isSupportedImageMimeType(mimeType: string): boolean {
  return SUPPORTED_IMAGE_MIME_TYPES.includes(mimeType as typeof SUPPORTED_IMAGE_MIME_TYPES[number]);
}

export function normalizeMaterialFormat(value: string): MaterialFormat {
  const normalized = value.trim().toUpperCase();
  switch (normalized) {
    case 'PDF':
      return 'PDF';
    case 'PPT':
    case 'PPTX':
      return 'PPT';
    case 'VIDEO':
    case 'MP4':
      return 'VIDEO';
    case 'AUDIO':
    case 'MP3':
      return 'AUDIO';
    case 'IMAGE':
    case 'JPG':
    case 'JPEG':
    case 'PNG':
    case 'WEBP':
      return 'IMAGE';
    default:
      throw new Error(`Unsupported material format: ${value}`);
  }
}
