import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import env from '../../config/index.js';

// Cấu hình Cloudinary
cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true,
});

export interface UploadResult {
  url: string;
  publicId: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

/**
 * Trích xuất publicId từ URL Cloudinary.
 * Ví dụ: "https://res.cloudinary.com/demo/image/upload/v1234/bizflow/stores/123/products/abc.webp"
 *       → "bizflow/stores/123/products/abc"
 */
export function extractCloudinaryPublicId(url: string): string | null {
  if (!url || typeof url !== 'string') return null;

  try {
    const urlObj = new URL(url);
    // Chỉ xử lý URL từ Cloudinary
    if (!urlObj.hostname.includes('cloudinary.com')) return null;

    const pathname = urlObj.pathname; // e.g. /demo/image/upload/v1234/bizflow/.../abc.webp
    // Tìm vị trí sau "/upload/" (hoặc "/upload/v12345/")
    const uploadMatch = pathname.match(/\/upload\/(?:v\d+\/)?(.+)$/);
    if (!uploadMatch || !uploadMatch[1]) return null;

    const pathWithExt = uploadMatch[1]; // bizflow/stores/123/products/abc.webp
    // Bỏ đuôi file extension
    const lastDotIndex = pathWithExt.lastIndexOf('.');
    if (lastDotIndex === -1) return pathWithExt;
    return pathWithExt.substring(0, lastDotIndex);
  } catch {
    return null;
  }
}

export class CloudinaryService {
  /**
   * Upload image buffer directly to Cloudinary using upload_stream
   */
  async uploadImage(
    buffer: Buffer,
    options?: {
      folder?: string;
      publicId?: string;
    },
  ): Promise<UploadResult> {
    if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
      throw new Error(
        'Cloudinary chưa được cấu hình. Vui lòng bổ sung CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET trong backend/.env',
      );
    }

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: options?.folder || env.CLOUDINARY_FOLDER,
          public_id: options?.publicId,
          resource_type: 'image',
          transformation: [
            { quality: 'auto:good' },
            { fetch_format: 'auto' },
            { flags: 'strip_profile' },
            { width: 1200, crop: 'limit' },
          ],
        },
        (error, result: UploadApiResponse | undefined) => {
          if (error || !result) {
            return reject(error || new Error('Upload lên Cloudinary thất bại'));
          }

          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            width: result.width,
            height: result.height,
            format: result.format,
            bytes: result.bytes,
          });
        },
      );

      uploadStream.on('error', (err) => {
        reject(err);
      });

      uploadStream.end(buffer);
    });
  }

  /**
   * Xoá ảnh khỏi Cloudinary qua publicId
   */
  async deleteImage(publicId: string): Promise<void> {
    if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
      return;
    }

    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (err) {
      console.error('[CloudinaryService] Failed to delete image:', err);
    }
  }

  /**
   * Xoá ảnh khỏi Cloudinary qua URL.
   * Tự động trích xuất publicId từ URL Cloudinary.
   */
  async deleteImageByUrl(url: string): Promise<void> {
    const publicId = extractCloudinaryPublicId(url);
    if (!publicId) {
      console.warn('[CloudinaryService] Cannot extract publicId from URL:', url);
      return;
    }
    await this.deleteImage(publicId);
  }
}

export const cloudinaryService = new CloudinaryService();
