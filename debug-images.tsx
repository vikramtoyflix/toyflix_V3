import React, { useState } from 'react';
import { useToyImages, useToyPrimaryImage } from './src/hooks/useInventoryManagement';
import { ToyImageDisplay } from './src/components/admin/ToyImageDisplay';

// Debug component to test image loading
export const ImageDebugComponent = () => {
  const [toyId, setToyId] = useState('');
  const { data: images, isLoading: imagesLoading } = useToyImages(toyId);
  const { data: primaryImage, isLoading: primaryLoading } = useToyPrimaryImage(toyId);

  const handleCheckImages = () => {
    if (!toyId) {
      console.log('❌ Please enter a toy ID to check images');
      return;
    }

    console.log('🔍 Checking images for toy ID:', toyId);
    console.log('📊 Images loading:', imagesLoading);
    console.log('📊 Primary loading:', primaryLoading);
    console.log('🖼️ Found images:', images);
    console.log('⭐ Primary image:', primaryImage);

    if (images && images.length > 0) {
      console.log('✅ Images found! Testing URL conversion...');
      images.forEach((img, index) => {
        console.log(`Image ${index + 1}:`, img.image_url);
        
        // Test URL conversion
        const testUrl = convertImageUrl(img.image_url);
        console.log(`Converted URL ${index + 1}:`, testUrl);
        
        // Test if image loads
        const testImg = new Image();
        testImg.onload = () => console.log(`✅ Image ${index + 1} loads successfully`);
        testImg.onerror = () => console.log(`❌ Image ${index + 1} failed to load`);
        testImg.src = testUrl;
      });
    } else {
      console.log('❌ No images found for this toy');
    }
  };

  const convertImageUrl = (url: string): string => {
    if (!url) return '/placeholder.svg';
    
    console.log('🔍 Converting URL:', url);
    
    // If it's already a full HTTP URL, return as-is
    if (url.startsWith('http')) return url;
    
    // If it's a relative path, return as-is
    if (url.startsWith('/')) return url;
    
    // Handle Supabase storage URLs
    if (url.includes('storage/v1/s3/toy-images/')) {
      const filename = url.split('storage/v1/s3/toy-images/').pop();
      return `https://wucwpyitzqjukcphczhr.supabase.co/storage/v1/object/public/toy-images/${filename}`;
    }
    
    if (url.includes('storage/v1/object/public/toy-images/')) {
      return url.startsWith('https://') ? url : `https://wucwpyitzqjukcphczhr.supabase.co/${url}`;
    }
    
    if (url.includes('toy-images/')) {
      const toyImagesIndex = url.indexOf('toy-images/');
      const pathAfterToyImages = url.substring(toyImagesIndex + 'toy-images/'.length);
      return `https://wucwpyitzqjukcphczhr.supabase.co/storage/v1/object/public/toy-images/${pathAfterToyImages}`;
    }
    
    // Fallback
    return `https://wucwpyitzqjukcphczhr.supabase.co/storage/v1/object/public/toy-images/${url}`;
  };

  return (
    <div style={{ padding: '20px', border: '2px solid #ccc', margin: '20px' }}>
      <h3>🔧 Image Debug Tool</h3>
      <div style={{ marginBottom: '10px' }}>
        <input
          type="text"
          placeholder="Enter toy ID to check images"
          value={toyId}
          onChange={(e) => setToyId(e.target.value)}
          style={{ padding: '8px', marginRight: '10px', width: '300px' }}
        />
        <button onClick={handleCheckImages} style={{ padding: '8px 16px' }}>
          Check Images
        </button>
      </div>
      
      <div style={{ marginTop: '20px' }}>
        <h4>Results:</h4>
        <p>Loading images: {imagesLoading ? 'Yes' : 'No'}</p>
        <p>Loading primary: {primaryLoading ? 'Yes' : 'No'}</p>
        <p>Images found: {images ? images.length : 0}</p>
        <p>Primary image: {primaryImage ? 'Found' : 'None'}</p>
      </div>

      {toyId && (
        <div style={{ marginTop: '20px' }}>
          <h4>Image Display Test:</h4>
          <ToyImageDisplay
            toyId={toyId}
            toyName="Debug Toy"
            size="lg"
            showImageCount={true}
            allowPreview={true}
          />
        </div>
      )}

      <div style={{ marginTop: '20px', fontSize: '12px', color: '#666' }}>
        <p><strong>Instructions:</strong></p>
        <ol>
          <li>Enter a toy ID from your database</li>
          <li>Click "Check Images" to see console output</li>
          <li>Check browser console for detailed logs</li>
          <li>Image should appear above if working correctly</li>
        </ol>
      </div>
    </div>
  );
};

// To use this component, add it to your admin page temporarily:
// import { ImageDebugComponent } from './debug-images';
// Then add <ImageDebugComponent /> to your JSX 