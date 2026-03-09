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

// Brand logos with more reliable sources
const brandLogos = [
  {
    name: "LEGO",
    url: "https://cdn.worldvectorlogo.com/logos/lego-group.svg",
    filename: "lego-logo.svg"
  },
  {
    name: "Mattel",
    url: "https://upload.wikimedia.org/wikipedia/commons/a/a3/Mattel-logo.svg",
    filename: "mattel-logo.svg"
  },
  {
    name: "Hasbro",
    url: "https://upload.wikimedia.org/wikipedia/commons/f/f7/Hasbro_logo.svg",
    filename: "hasbro-logo.svg"
  },
  {
    name: "Fisher-Price",
    url: "https://logoeps.com/wp-content/uploads/2013/03/fisher-price-vector-logo.png",
    filename: "fisher-price-logo.png"
  },
  {
    name: "Playmobil",
    url: "https://logos-download.com/wp-content/uploads/2016/09/Playmobil_logo.png",
    filename: "playmobil-logo.png"
  },
  {
    name: "VTech",
    url: "https://seeklogo.com/images/V/vtech-logo-7B8B8B8B8B-seeklogo.com.png",
    filename: "vtech-logo.png"
  },
  {
    name: "Melissa & Doug",
    url: "https://static.wixstatic.com/media/b0b36a_c2c2c2c2c2c2c2c2c2c2c2c2c2c2c2c2~mv2.png",
    filename: "melissa-doug-logo.png"
  },
  {
    name: "LeapFrog",
    url: "https://1000logos.net/wp-content/uploads/2020/09/LeapFrog-Logo.png",
    filename: "leapfrog-logo.png"
  },
  {
    name: "Little Tikes",
    url: "https://logos-world.net/wp-content/uploads/2020/12/Little-Tikes-Logo.png",
    filename: "little-tikes-logo.png"
  },
  {
    name: "Crayola",
    url: "https://upload.wikimedia.org/wikipedia/commons/8/87/Crayola_logo.svg",
    filename: "crayola-logo.svg"
  },
  {
    name: "Play-Doh",
    url: "https://logoeps.com/wp-content/uploads/2013/03/play-doh-vector-logo.png",
    filename: "play-doh-logo.png"
  },
  {
    name: "Hot Wheels",
    url: "https://logoeps.com/wp-content/uploads/2013/03/hot-wheels-vector-logo.png",
    filename: "hot-wheels-logo.png"
  },
  {
    name: "Barbie",
    url: "https://upload.wikimedia.org/wikipedia/commons/8/87/Barbie_Logo.svg",
    filename: "barbie-logo.svg"
  },
  {
    name: "Nerf",
    url: "https://logos-download.com/wp-content/uploads/2016/09/Nerf_logo.png",
    filename: "nerf-logo.png"
  },
  {
    name: "Disney",
    url: "https://upload.wikimedia.org/wikipedia/commons/3/3e/Disney%2B_logo.svg",
    filename: "disney-logo.svg"
  }
];

// Alternative: Simple placeholder logos with brand names
const createPlaceholderLogos = () => {
  const brands = [
    "LEGO", "Mattel", "Hasbro", "Fisher-Price", "Playmobil", 
    "VTech", "Melissa & Doug", "LeapFrog", "Little Tikes", 
    "Crayola", "Play-Doh", "Hot Wheels", "Barbie", "Nerf", 
    "Disney", "Paw Patrol", "Thomas & Friends", "Peppa Pig"
  ];

  return brands.map(brand => ({
    name: brand,
    url: `https://via.placeholder.com/200x80/ffffff/000000?text=${encodeURIComponent(brand)}`,
    filename: `${brand.toLowerCase().replace(/[^a-z0-9]/g, '-')}-logo.png`
  }));
};

// Function to download a file with better error handling
function downloadFile(url, filepath, brandName) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    const file = fs.createWriteStream(filepath);
    
    console.log(`📥 Downloading ${brandName} logo...`);
    
    const request = protocol.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    }, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        console.log(`🔄 Redirected for ${brandName}, following redirect...`);
        file.close();
        fs.unlinkSync(filepath);
        return downloadFile(response.headers.location, filepath, brandName)
          .then(resolve)
          .catch(reject);
      }
      
      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(filepath);
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
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
      }
      reject(new Error(`❌ Failed to download ${brandName}: ${error.message}`));
    });
    
    file.on('error', (error) => {
      file.close();
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
      }
      reject(new Error(`❌ File error for ${brandName}: ${error.message}`));
    });
    
    // Set timeout
    request.setTimeout(10000, () => {
      request.destroy();
      file.close();
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
      }
      reject(new Error(`❌ Timeout downloading ${brandName}`));
    });
  });
}

// Main download function
async function downloadAllLogos(usePlaceholders = false) {
  console.log('🚀 Starting brand logo downloads...\n');
  
  const logosToDownload = usePlaceholders ? createPlaceholderLogos() : brandLogos;
  
  const results = {
    successful: [],
    failed: []
  };
  
  for (const brand of logosToDownload) {
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
      
      // Add delay between downloads
      await new Promise(resolve => setTimeout(resolve, 1000));
      
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
    results.failed.forEach(item => console.log(`   • ${item.name}`));
    
    // Offer to download placeholders for failed ones
    if (results.failed.length > 0 && !usePlaceholders) {
      console.log('\n💡 Tip: Run with --placeholders flag to download placeholder logos for failed brands');
    }
  }
  
  console.log(`\n📁 Files saved to: ${uploadsDir}`);
  
  // Generate updated component
  generateUpdatedComponent(results.successful, logosToDownload);
}

// Generate updated component code
function generateUpdatedComponent(successfulDownloads, logosToDownload) {
  console.log('\n📝 Generating updated component code...');
  
  // Existing logos
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
  
  // New logos
  const newLogos = logosToDownload
    .filter(brand => successfulDownloads.includes(brand.name))
    .map(brand => ({
      name: brand.name,
      logo: `/lovable-uploads/${brand.filename}`,
      alt: `${brand.name} - ${getAltText(brand.name)}`
    }));
  
  const allLogos = [...existingLogos, ...newLogos];
  
  const componentCode = `  const partners = [
${allLogos.map(logo => `    {
      name: "${logo.name}",
      logo: "${logo.logo}",
      alt: "${logo.alt}"
    }`).join(',\n')}
  ];`;
  
  // Write to file
  const outputFile = path.join(__dirname, 'updated-partners-array.js');
  fs.writeFileSync(outputFile, componentCode);
  
  console.log(`📄 Updated partners array saved to: ${outputFile}`);
  console.log('\n🔧 Next steps:');
  console.log('1. Copy the array from updated-partners-array.js');
  console.log('2. Replace the partners array in src/components/PremiumPartners.tsx');
  console.log('3. Test the component to ensure all logos display correctly');
}

// Helper function for alt text
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

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  const usePlaceholders = process.argv.includes('--placeholders');
  
  if (usePlaceholders) {
    console.log('🎨 Using placeholder logos mode\n');
  }
  
  downloadAllLogos(usePlaceholders).catch(error => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
}

export { downloadAllLogos }; 