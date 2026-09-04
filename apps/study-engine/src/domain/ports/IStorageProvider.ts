export interface StorageFile {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  sizeBytes: number;
}

export interface StorageUploadResult {
  fileUrl: string;
  fileKey: string;
}

export interface IStorageProvider {
  upload(file: StorageFile): Promise<StorageUploadResult>;
  delete(fileKey: string): Promise<void>;
  deleteBatch(fileKeys: string[]): Promise<void>;
}
