#!/usr/bin/env tsx

import { readdir, readFile, stat, writeFile } from 'fs/promises';
import { join, extname, basename } from 'path';
import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { fileToArrayBuffer } from '@/utils/imageOptimization';

// Configuration
const TOY_IMAGES_DIR = join(process.cwd(), 'toy_images');
const BATCH_SIZE = 10; // Upload 10 images at a time
const MAX_RETRIES = 3;

// S3 Configuration
const S3_CONFIG = {
  endpoint: 'https://wucwpyitzqjukcphczhr.supabase.co/storage/v1/s3',
  region: 'ap-south-1',
  credentials: {
    accessKeyId: '909a3eb7eafecdc3a6097a3851311319',
    secretAccessKey: '332a112da2bf15f9fba626acc2a4ea77a018b24944af028d2faf6f64d5e608b4'
  },
  forcePathStyle: true,
};

// Supabase Configuration
const supabaseUrl = 'https://wucwpyitzqjukcphczhr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1Y3dweWl0enFqdWtjcGhjemhyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTMyNDI5NiwiZXhwIjoyMDY0OTAwMjk2fQ.aBnxAxxD4WiiDQS7m4j1JiluHa8BdCak9y334RILiKc';
const supabase = createClient(supabaseUrl, supabaseKey);
const s3Client = new S3Client(S3_CONFIG);

interface ToyImage {
  toyName: string;
  folderName: string;
  imagePath: string;
  fileName: string;
  isPrimary: boolean;
  order: number;
}

interface UploadResult {
  success: boolean;
  toyName: string;
  imagePath: string;
  s3Url?: string;
  error?: string;
}

interface DatabaseUpdate {
  toyId: string;
  toyName: string;
  imageUrl: string;
  isPrimary: boolean;
  order: number;
}

// Helper function to create URL-friendly slug
function createSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .trim();
}

// Helper function to get file extension
function getFileExtension(mimeType: string): string {
  const extensions: { [key: string]: string } = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif'
  };
  return extensions[mimeType] || '.jpg';
}

// Helper function to determine MIME type from file extension
function getMimeType(filePath: string): string {
  const ext = extname(filePath).toLowerCase();
  const mimeTypes: { [key: string]: string } = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif'
  };
  return mimeTypes[ext] || 'image/jpeg';
}

// Function to scan toy images directory
async function scanToyImages(): Promise<ToyImage[]> {
  console.log('🔍 Scanning toy images directory...');
  
  const toyImages: ToyImage[] = [];
  
  try {
    const folders = await readdir(TOY_IMAGES_DIR);
    
    for (const folder of folders) {
      const folderPath = join(TOY_IMAGES_DIR, folder);
      const folderStat = await stat(folderPath);
      
      if (folderStat.isDirectory()) {
        const imageFiles = await readdir(folderPath);
        const imageFilesFiltered = imageFiles.filter(file => 
          /\.(jpg|jpeg|png|webp|gif)$/i.test(file)
        );
        
        if (imageFilesFiltered.length > 0) {
          // Sort images to ensure consistent ordering
          imageFilesFiltered.sort();
          
          imageFilesFiltered.forEach((imageFile, index) => {
            const imagePath = join(folderPath, imageFile);
            const isPrimary = index === 0; // First image is primary
            
            toyImages.push({
              toyName: folder,
              folderName: folder,
              imagePath,
              fileName: imageFile,
              isPrimary,
              order: index
            });
          });
        }
      }
    }
    
    console.log(`✅ Found ${toyImages.length} images across ${folders.length} toy folders`);
    return toyImages;
  } catch (error) {
    console.error('❌ Error scanning toy images directory:', error);
    throw error;
  }
}

// Function to upload single image to S3
async function uploadImageToS3(toyImage: ToyImage): Promise<UploadResult> {
  const maxRetries = MAX_RETRIES;
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`📤 Uploading ${toyImage.fileName} (attempt ${attempt}/${maxRetries})`);
      
      // Read file
      const fileBuffer = await readFile(toyImage.imagePath);
      const mimeType = getMimeType(toyImage.imagePath);
      
      // Create S3 key
      const toySlug = createSlug(toyImage.toyName);
      const imageType = toyImage.isPrimary ? 'primary' : `secondary-${toyImage.order}`;
      const fileExtension = getFileExtension(mimeType);
      const s3Key = `toys/${toySlug}/${imageType}${fileExtension}`;
      
      // Upload to S3
      const command = new PutObjectCommand({
        Bucket: 'toy-images',
        Key: s3Key,
        Body: fileBuffer,
        ContentType: mimeType,
        ACL: 'public-read',
        CacheControl: 'public, max-age=31536000' // 1 year cache
      });
      
      await s3Client.send(command);
      
      // Construct public URL
      const s3Url = `${S3_CONFIG.endpoint}/toy-images/${s3Key}`;
      
      console.log(`✅ Successfully uploaded: ${s3Key}`);
      
      return {
        success: true,
        toyName: toyImage.toyName,
        imagePath: toyImage.imagePath,
        s3Url
      };
      
    } catch (error) {
      lastError = error as Error;
      console.error(`❌ Upload attempt ${attempt} failed for ${toyImage.fileName}:`, error);
      
      if (attempt < maxRetries) {
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }
  
  return {
    success: false,
    toyName: toyImage.toyName,
    imagePath: toyImage.imagePath,
    error: lastError?.message || 'Upload failed after all retries'
  };
}

// Function to get toys from database
async function getToysFromDatabase(): Promise<{ id: string; name: string }[]> {
  console.log('🔍 Fetching toys from database...');
  
  try {
    const { data: toys, error } = await supabase
      .from('toys')
      .select('id, name')
      .order('name');
    
    if (error) {
      throw error;
    }
    
    console.log(`✅ Found ${toys?.length || 0} toys in database`);
    return toys || [];
  } catch (error) {
    console.error('❌ Error fetching toys from database:', error);
    throw error;
  }
}

// Function to find best matching toy for image folder
function findBestToyMatch(folderName: string, toys: { id: string; name: string }[]): { id: string; name: string } | null {
  // First try exact match
  const exactMatch = toys.find(toy => 
    toy.name.toLowerCase() === folderName.toLowerCase()
  );
  if (exactMatch) return exactMatch;
  
  // Try partial match
  const partialMatch = toys.find(toy => 
    toy.name.toLowerCase().includes(folderName.toLowerCase()) ||
    folderName.toLowerCase().includes(toy.name.toLowerCase())
  );
  if (partialMatch) return partialMatch;
  
  // Try fuzzy matching (simple approach)
  const fuzzyMatch = toys.find(toy => {
    const toyWords = toy.name.toLowerCase().split(/\s+/);
    const folderWords = folderName.toLowerCase().split(/\s+/);
    const commonWords = toyWords.filter(word => folderWords.includes(word));
    return commonWords.length >= Math.min(toyWords.length, folderWords.length) * 0.5;
  });
  
  return fuzzyMatch || null;
}

// Function to update database with new image URLs
async function updateDatabaseWithImages(updates: DatabaseUpdate[]): Promise<void> {
  console.log('💾 Updating database with new image URLs...');
  
  try {
    // First, delete existing toy_images entries for these toys
    const toyIds = [...new Set(updates.map(u => u.toyId))];
    
    const { error: deleteError } = await supabase
      .from('toy_images')
      .delete()
      .in('toy_id', toyIds);
    
    if (deleteError) {
      console.warn('⚠️ Warning deleting existing images:', deleteError);
    }
    
    // Insert new image records
    const imageRecords = updates.map(update => ({
      toy_id: update.toyId,
      image_url: update.imageUrl,
      display_order: update.order,
      is_primary: update.isPrimary
    }));
    
    const { error: insertError } = await supabase
      .from('toy_images')
      .insert(imageRecords);
    
    if (insertError) {
      throw insertError;
    }
    
    console.log(`✅ Successfully updated database with ${updates.length} image records`);
  } catch (error) {
    console.error('❌ Error updating database:', error);
    throw error;
  }
}

// Function to create mapping file for manual review
async function createMappingFile(toyImages: ToyImage[], toys: { id: string; name: string }[]): Promise<void> {
  console.log('📝 Creating mapping file for manual review...');
  
  const mapping: { folderName: string; matchedToyName?: string; matchedToyId?: string; status: string }[] = [];
  
  for (const toyImage of toyImages) {
    const matchedToy = findBestToyMatch(toyImage.toyName, toys);
    
    mapping.push({
      folderName: toyImage.toyName,
      matchedToyName: matchedToy?.name,
      matchedToyId: matchedToy?.id,
      status: matchedToy ? 'matched' : 'unmatched'
    });
  }
  
  // Remove duplicates based on folderName
  const uniqueMapping = mapping.filter((item, index, self) => 
    index === self.findIndex(t => t.folderName === item.folderName)
  );
  
  const mappingContent = JSON.stringify(uniqueMapping, null, 2);
  await writeFile('toy-image-mapping.json', mappingContent);
  
  const matchedCount = uniqueMapping.filter(m => m.status === 'matched').length;
  const unmatchedCount = uniqueMapping.filter(m => m.status === 'unmatched').length;
  
  console.log(`📊 Mapping created: ${matchedCount} matched, ${unmatchedCount} unmatched`);
  console.log('📄 Review toy-image-mapping.json and update if needed');
}

// Main execution function
async function main() {
  console.log('🚀 Starting toy image upload process...');
  console.log('=' .repeat(50));
  
  try {
    // Step 1: Scan toy images directory
    const toyImages = await scanToyImages();
    
    // Step 2: Get toys from database
    const toys = await getToysFromDatabase();
    
    // Step 3: Create mapping file for review
    await createMappingFile(toyImages, toys);
    
    // Step 4: Upload images in batches
    console.log('📤 Starting image uploads...');
    const uploadResults: UploadResult[] = [];
    const databaseUpdates: DatabaseUpdate[] = [];
    
    for (let i = 0; i < toyImages.length; i += BATCH_SIZE) {
      const batch = toyImages.slice(i, i + BATCH_SIZE);
      console.log(`\n📦 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(toyImages.length / BATCH_SIZE)}`);
      
      const batchPromises = batch.map(async (toyImage) => {
        const result = await uploadImageToS3(toyImage);
        
        if (result.success && result.s3Url) {
          // Find matching toy
          const matchedToy = findBestToyMatch(toyImage.toyName, toys);
          
          if (matchedToy) {
            databaseUpdates.push({
              toyId: matchedToy.id,
              toyName: matchedToy.name,
              imageUrl: result.s3Url,
              isPrimary: toyImage.isPrimary,
              order: toyImage.order
            });
          } else {
            console.warn(`⚠️ No matching toy found for: ${toyImage.toyName}`);
          }
        }
        
        return result;
      });
      
      const batchResults = await Promise.all(batchPromises);
      uploadResults.push(...batchResults);
      
      // Small delay between batches to avoid overwhelming the API
      if (i + BATCH_SIZE < toyImages.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // Step 5: Update database
    if (databaseUpdates.length > 0) {
      await updateDatabaseWithImages(databaseUpdates);
    }
    
    // Step 6: Generate report
    const successfulUploads = uploadResults.filter(r => r.success).length;
    const failedUploads = uploadResults.filter(r => !r.success).length;
    
    console.log('\n' + '=' .repeat(50));
    console.log('📊 UPLOAD SUMMARY');
    console.log('=' .repeat(50));
    console.log(`✅ Successful uploads: ${successfulUploads}`);
    console.log(`❌ Failed uploads: ${failedUploads}`);
    console.log(`💾 Database updates: ${databaseUpdates.length}`);
    console.log(`📄 Mapping file: toy-image-mapping.json`);
    
    if (failedUploads > 0) {
      console.log('\n❌ Failed uploads:');
      uploadResults
        .filter(r => !r.success)
        .forEach(r => console.log(`  - ${r.toyName}/${r.imagePath}: ${r.error}`));
    }
    
    console.log('\n🎉 Toy image upload process completed!');
    
  } catch (error) {
    console.error('💥 Fatal error during upload process:', error);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);

export { main as uploadToyImages }; 