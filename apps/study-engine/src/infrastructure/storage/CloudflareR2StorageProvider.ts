import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
} from '@aws-sdk/client-s3';
import {
  IStorageProvider,
  StorageFile,
  StorageUploadResult,
} from '../../domain/ports/IStorageProvider.js';

export interface CloudflareR2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  endpoint?: string;
}

export class CloudflareR2StorageProvider implements IStorageProvider {
  private client: S3Client;
  private bucketName: string;

  constructor(config: CloudflareR2Config) {
    this.bucketName = config.bucketName;
    const endpoint = config.endpoint || `https://${config.accountId}.r2.cloudflarestorage.com`;

    this.client = new S3Client({
      region: 'auto',
      endpoint,
      forcePathStyle: true,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  public async upload(file: StorageFile): Promise<StorageUploadResult> {
    const fileKey = `materials/${Date.now()}-${file.filename}`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: fileKey,
      Body: file.buffer,
      ContentType: file.mimeType,
    });

    await this.client.send(command);

    return {
      fileKey,
      fileUrl: fileKey,
    };
  }

  public async delete(fileKey: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: fileKey,
    });

    await this.client.send(command);
  }

  public async deleteBatch(fileKeys: string[]): Promise<void> {
    if (!fileKeys || fileKeys.length === 0) return;

    const command = new DeleteObjectsCommand({
      Bucket: this.bucketName,
      Delete: {
        Objects: fileKeys.map(key => ({ Key: key })),
        Quiet: true,
      },
    });

    await this.client.send(command);
  }
}
