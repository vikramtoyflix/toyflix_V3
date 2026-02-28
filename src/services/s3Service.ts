import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

export interface S3UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

// S3 Configuration using the correct Supabase credentials with browser compatibility
const S3_CONFIG = {
  endpoint: `${import.meta.env.VITE_SUPABASE_URL || 'https://wucwpyitzqjukcphczhr.supabase.co'}/storage/v1/s3`,
  region: 'ap-south-1',
  credentials: {
    accessKeyId: import.meta.env.VITE_SUPABASE_S3_ACCESS_KEY || '',
    secretAccessKey: import.meta.env.VITE_SUPABASE_S3_SECRET_KEY || ''
  },
  forcePathStyle: true, // Required for non-AWS S3 endpoints
  // Browser-specific configuration
  requestHandler: {
    requestTimeout: 30000,
    httpsAgent: undefined
  }
};

const s3Client = new S3Client(S3_CONFIG);

// Helper function for getting file extension
const getFileExtension = (mimeType: string): string => {
  const extensions: { [key: string]: string } = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif'
  };
  return extensions[mimeType] || '.jpg';
};

// Convert File/Blob to ArrayBuffer for better browser compatibility
const fileToArrayBuffer = async (file: File | Blob): Promise<ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
};

export const s3Service = {
  /**
   * Upload a file to S3 bucket (browser-compatible)
   */
  async uploadFile(file: File, fileName?: string, bucketName: string = 'toy-images'): Promise<S3UploadResult> {
    try {
      console.log('S3 Upload: Starting file upload', { 
        fileName: file.name, 
        size: file.size, 
        type: file.type 
      });

      const fileExtension = getFileExtension(file.type);
      const uniqueFileName = fileName 
        ? `${fileName}_${Date.now()}${fileExtension}`
        : `image_${Date.now()}${fileExtension}`;

      // Convert file to ArrayBuffer for better browser compatibility
      const arrayBuffer = await fileToArrayBuffer(file);
      
      console.log('S3 Upload: File converted to ArrayBuffer', { 
        size: arrayBuffer.byteLength,
        fileName: uniqueFileName 
      });

      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: uniqueFileName,
        Body: new Uint8Array(arrayBuffer), // Use Uint8Array instead of File
        ContentType: file.type,
        ContentLength: arrayBuffer.byteLength,
        ACL: 'public-read' // Make the image publicly accessible
      });

      console.log('S3 Upload: Sending command to S3...');
      const result = await s3Client.send(command);
      console.log('S3 Upload: Command sent successfully', result);

      // Construct the public URL
      const publicUrl = `${S3_CONFIG.endpoint}/${bucketName}/${uniqueFileName}`;
      
      console.log('S3 Upload: Generated public URL', publicUrl);

      return { success: true, url: publicUrl };
    } catch (error) {
      console.error('S3 upload error:', error);
      console.error('Error details:', {
        name: error?.name,
        message: error?.message,
        stack: error?.stack
      });
      
      return { 
        success: false, 
        error: `S3 upload failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  },

  /**
   * Upload a blob (downloaded image) to S3 (browser-compatible)
   */
  async uploadBlob(blob: Blob, fileName: string, bucketName: string = 'toy-images'): Promise<S3UploadResult> {
    try {
      console.log('S3 Blob Upload: Starting blob upload', { 
        size: blob.size, 
        type: blob.type,
        fileName 
      });

      const fileExtension = getFileExtension(blob.type);
      const uniqueFileName = `${fileName}_${Date.now()}${fileExtension}`;

      // Convert blob to ArrayBuffer for better browser compatibility
      const arrayBuffer = await fileToArrayBuffer(blob);
      
      console.log('S3 Blob Upload: Blob converted to ArrayBuffer', { 
        size: arrayBuffer.byteLength,
        fileName: uniqueFileName 
      });

      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: uniqueFileName,
        Body: new Uint8Array(arrayBuffer), // Use Uint8Array instead of Blob
        ContentType: blob.type,
        ContentLength: arrayBuffer.byteLength,
        ACL: 'public-read'
      });

      console.log('S3 Blob Upload: Sending command to S3...');
      const result = await s3Client.send(command);
      console.log('S3 Blob Upload: Command sent successfully', result);

      // Construct the public URL
      const publicUrl = `${S3_CONFIG.endpoint}/${bucketName}/${uniqueFileName}`;
      
      console.log('S3 Blob Upload: Generated public URL', publicUrl);

      return { success: true, url: publicUrl };
    } catch (error) {
      console.error('S3 blob upload error:', error);
      console.error('Error details:', {
        name: error?.name,
        message: error?.message,
        stack: error?.stack
      });
      
      return { 
        success: false, 
        error: `S3 blob upload failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  },

  /**
   * Delete a file from S3
   */
  async deleteFile(fileName: string, bucketName: string = 'toy-images'): Promise<{ success: boolean; error?: string }> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: bucketName,
        Key: fileName
      });

      await s3Client.send(command);
      return { success: true };
    } catch (error) {
      console.error('S3 delete error:', error);
      return { 
        success: false, 
        error: `S3 delete failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  },

  /**
   * Get file extension from MIME type
   */
  getFileExtension(mimeType: string): string {
    return getFileExtension(mimeType);
  },

  /**
   * Extract file name from S3 URL for deletion
   */
  extractFileNameFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      return pathParts[pathParts.length - 1];
    } catch (error) {
      console.error('Error extracting filename from URL:', error);
      return null;
    }
  }
}; 