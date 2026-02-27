import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import { fileURLToPath } from 'url';

// Get current directory in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../public/lovable-uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Brand logos to download
const brandLogos = [
  {
    name: "LEGO",
    url: "https://logos-world.net/wp-content/uploads/2020/09/LEGO-Logo.png",
    filename: "lego-logo.png"
  },
  {
    name: "Mattel",
    url: "https://logos-world.net/wp-content/uploads/2020/11/Mattel-Logo.png",
    filename: "mattel-logo.png"
  },
  {
    name: "Hasbro",
    url: "https://logos-world.net/wp-content/uploads/2020/11/Hasbro-Logo.png",
    filename: "hasbro-logo.png"
  },
  {
    name: "Fisher-Price",
    url: "https://logos-world.net/wp-content/uploads/2020/11/Fisher-Price-Logo.png",
    filename: "fisher-price-logo.png"
  },
  {
    name: "Playmobil",
    url: "https://logos-world.net/wp-content/uploads/2020/11/Playmobil-Logo.png",
    filename: "playmobil-logo.png"
  },
  {
    name: "VTech",
    url: "https://logos-world.net/wp-content/uploads/2020/11/VTech-Logo.png",
    filename: "vtech-logo.png"
  },
  {
    name: "Melissa & Doug",
    url: "https://logos-world.net/wp-content/uploads/2020/11/Melissa-Doug-Logo.png",
    filename: "melissa-doug-logo.png"
  },
  {
    name: "LeapFrog",
    url: "https://logos-world.net/wp-content/uploads/2020/11/LeapFrog-Logo.png",
    filename: "leapfrog-logo.png"
  },
  {
    name: "Little Tikes",
    url: "https://logos-world.net/wp-content/uploads/2020/11/Little-Tikes-Logo.png",
    filename: "little-tikes-logo.png"
  },
  {
    name: "Crayola",
    url: "https://logos-world.net/wp-content/uploads/2020/11/Crayola-Logo.png",
    filename: "crayola-logo.png"
  },
  {
    name: "Play-Doh",
    url: "https://logos-world.net/wp-content/uploads/2020/11/Play-Doh-Logo.png",
    filename: "play-doh-logo.png"
  },
  {
    name: "Hot Wheels",
    url: "https://logos-world.net/wp-content/uploads/2020/11/Hot-Wheels-Logo.png",
    filename: "hot-wheels-logo.png"
  },
  {
    name: "Barbie",
    url: "https://logos-world.net/wp-content/uploads/2020/11/Barbie-Logo.png",
    filename: "barbie-logo.png"
  },
  {
    name: "Nerf",
    url: "https://logos-world.net/wp-content/uploads/2020/11/Nerf-Logo.png",
    filename: "nerf-logo.png"
  },
  {
    name: "Disney",
    url: "https://logos-world.net/wp-content/uploads/2020/11/Disney-Logo.png",
    filename: "disney-logo.png"
  },
  {
    name: "Paw Patrol",
    url: "https://logos-world.net/wp-content/uploads/2020/11/Paw-Patrol-Logo.png",
    filename: "paw-patrol-logo.png"
  },
  {
    name: "Thomas & Friends",
    url: "https://logos-world.net/wp-content/uploads/2020/11/Thomas-Friends-Logo.png",
    filename: "thomas-friends-logo.png"
  },
  {
    name: "Peppa Pig",
    url: "https://logos-world.net/wp-content/uploads/2020/11/Peppa-Pig-Logo.png",
    filename: "peppa-pig-logo.png"
  }
];

// Function to download a file
function downloadFile(url, filepath, brandName) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    const file = fs.createWriteStream(filepath);
    
    console.log(`📥 Downloading ${brandName} logo...`);
    
    const request = protocol.get(url, (response) => {
      // Check if we got redirected
      if (response.statusCode === 301 || response.statusCode === 302) {
        console.log(`🔄 Redirected for ${brandName}, following redirect...`);
        file.close();
        fs.unlinkSync(filepath); // Delete the empty file
        return downloadFile(response.headers.location, filepath, brandName)
          .then(resolve)
          .catch(reject);
      }
      
      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(filepath); // Delete the empty file
        reject(new Error(`❌ Failed to download ${brandName}: HTTP ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        console.log(`✅ Successfully downloaded ${brandName} logo`);
        resolve();
      });
    });
    
    request.on('error', (error) => {
      file.close();
      fs.unlinkSync(filepath); // Delete the empty file
      reject(new Error(`❌ Failed to download ${brandName}: ${error.message}`));
    });
    
    file.on('error', (error) => {
      file.close();
      fs.unlinkSync(filepath); // Delete the empty file
      reject(new Error(`❌ File error for ${brandName}: ${error.message}`));
    });
  });
}

// Function to download all logos
async function downloadAllLogos() {
  console.log('🚀 Starting brand logo downloads...\n');
  
  const results = {
    successful: [],
    failed: []
  };
  
  for (const brand of brandLogos) {
    const filepath = path.join(uploadsDir, brand.filename);
    
    // Skip if file already exists
    if (fs.existsSync(filepath)) {
      console.log(`⏭️  ${brand.name} logo already exists, skipping...`);
      results.successful.push(brand.name);
      continue;
    }
    
    try {
      await downloadFile(brand.url, filepath, brand.name);
      results.successful.push(brand.name);
      
      // Add a small delay to be respectful to the server
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.error(error.message);
      results.failed.push({ name: brand.name, error: error.message });
    }
  }
  
  // Print summary
  console.log('\n📊 Download Summary:');
  console.log(`✅ Successful: ${results.successful.length}`);
  console.log(`❌ Failed: ${results.failed.length}`);
  
  if (results.successful.length > 0) {
    console.log('\n🎉 Successfully downloaded:');
    results.successful.forEach(name => console.log(`   • ${name}`));
  }
  
  if (results.failed.length > 0) {
    console.log('\n💥 Failed downloads:');
    results.failed.forEach(item => console.log(`   • ${item.name}: ${item.error}`));
  }
  
  console.log(`\n📁 Files saved to: ${uploadsDir}`);
  
  // Generate the updated component code
  generateUpdatedComponent(results.successful);
}

// Function to generate updated component code with local paths
function generateUpdatedComponent(successfulDownloads) {
  console.log('\n📝 Generating updated component code...');
  
  const updatedLogos = brandLogos.map(brand => {
    const wasDownloaded = successfulDownloads.includes(brand.name);
    return {
      name: brand.name,
      logo: wasDownloaded ? `/lovable-uploads/${brand.filename}` : brand.url,
      alt: `${brand.name} - ${getAltText(brand.name)}`
    };
  });
  
  // Add existing logos
  const existingLogos = [
    {
      name: "PlayShifu",
      logo: "/lovable-uploads/e899c4c1-a8a6-45ee-a87f-7a137acd5a5c.png",
      alt: "PlayShifu - Educational AR toys"
    },
    {
      name: "PLAY",
      logo: "/lovable-uploads/664b0b05-233b-4283-bc83-c91551fb2c10.png",
      alt: "PLAY - Creative learning toys"
    },
    {
      name: "Hape",
      logo: "/lovable-uploads/89bf9009-a482-4be0-a723-a5507be7e0dd.png",
      alt: "Hape - Wooden educational toys"
    },
    {
      name: "Funskool",
      logo: "/lovable-uploads/4a5c080f-acd2-46da-a754-82b954dcd0fd.png",
      alt: "Funskool - Fun learning toys"
    }
  ];
  
  const allLogos = [...existingLogos, ...updatedLogos];
  
  const componentCode = `  const partners = [
${allLogos.map(logo => `    {
      name: "${logo.name}",
      logo: "${logo.logo}",
      alt: "${logo.alt}"
    }`).join(',\n')}
  ];`;
  
  // Write to a file
  const outputFile = path.join(__dirname, 'updated-partners-array.js');
  fs.writeFileSync(outputFile, componentCode);
  
  console.log(`📄 Updated partners array saved to: ${outputFile}`);
  console.log('\n🔧 Copy this array to replace the partners array in PremiumPartners.tsx');
}

// Helper function to get alt text based on brand name
function getAltText(brandName) {
  const altTexts = {
    "LEGO": "Building blocks and construction toys",
    "Mattel": "Global toy manufacturer",
    "Hasbro": "Action figures and board games",
    "Fisher-Price": "Educational infant and toddler toys",
    "Playmobil": "Themed construction toys",
    "VTech": "Electronic learning toys",
    "Melissa & Doug": "Wooden educational toys",
    "LeapFrog": "Educational technology toys",
    "Little Tikes": "Outdoor and indoor play equipment",
    "Crayola": "Art and craft supplies",
    "Play-Doh": "Modeling compound and creativity toys",
    "Hot Wheels": "Die-cast cars and tracks",
    "Barbie": "Fashion dolls and accessories",
    "Nerf": "Foam-based action toys",
    "Disney": "Character-based toys and merchandise",
    "Paw Patrol": "Character toys and playsets",
    "Thomas & Friends": "Train toys and accessories",
    "Peppa Pig": "Character toys and playsets"
  };
  
  return altTexts[brandName] || "Toy brand";
}

// Run the download script
if (import.meta.url === `file://${process.argv[1]}`) {
  downloadAllLogos().catch(error => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
}

export { downloadAllLogos }; 