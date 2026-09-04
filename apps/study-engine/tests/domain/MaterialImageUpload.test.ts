import { describe, it, expect } from 'vitest';
import { Material } from '../../src/domain/entities/Material.js';
import {
  isSupportedImageMimeType,
  isValidMaterialFormat,
} from '../../src/domain/value-objects/MaterialFormat.js';

describe('Material Image Support & Format Validation', () => {
  it('should accept IMAGE as a valid material format', () => {
    expect(isValidMaterialFormat('IMAGE')).toBe(true);
  });

  it('should validate supported image mime types (JPG, PNG, WebP)', () => {
    expect(isSupportedImageMimeType('image/jpeg')).toBe(true);
    expect(isSupportedImageMimeType('image/png')).toBe(true);
    expect(isSupportedImageMimeType('image/webp')).toBe(true);
    expect(isSupportedImageMimeType('image/gif')).toBe(false);
    expect(isSupportedImageMimeType('application/json')).toBe(false);
  });

  it('should create a Material entity for an image proof or exercise', () => {
    const material = Material.create({
      studentId: 'student-99',
      title: 'Foto da Prova de Álgebra Lineal',
      format: 'IMAGE',
      fileUrl: 'https://r2.cloudflare.com/proof-algebra.png',
      fileSizeBytes: 512000,
      mimeType: 'image/png',
    });

    expect(material.id).toBeDefined();
    expect(material.format).toBe('IMAGE');
    expect(material.mimeType).toBe('image/png');
    expect(material.status).toBe('PENDING');
  });
});
