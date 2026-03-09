import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../public/lovable-uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Brand information for logo generation
const brands = [
  { name: "LEGO", color: "#FFCF00", bgColor: "#E4002B" },
  { name: "Mattel", color: "#E30613", bgColor: "#FFFFFF" },
  { name: "Hasbro", color: "#0084FF", bgColor: "#FFFFFF" },
  { name: "Fisher-Price", color: "#FF6B35", bgColor: "#FFFFFF" },
  { name: "Playmobil", color: "#00A0B0", bgColor: "#FFFFFF" },
  { name: "VTech", color: "#FF6B6B", bgColor: "#FFFFFF" },
  { name: "Melissa & Doug", color: "#8E44AD", bgColor: "#FFFFFF" },
  { name: "LeapFrog", color: "#2ECC71", bgColor: "#FFFFFF" },
  { name: "Little Tikes", color: "#F39C12", bgColor: "#FFFFFF" },
  { name: "Crayola", color: "#E67E22", bgColor: "#FFFFFF" },
  { name: "Play-Doh", color: "#9B59B6", bgColor: "#FFFFFF" },
  { name: "Hot Wheels", color: "#E74C3C", bgColor: "#FFFFFF" },
  { name: "Barbie", color: "#E91E63", bgColor: "#FFFFFF" },
  { name: "Nerf", color: "#FF5722", bgColor: "#FFFFFF" },
  { name: "Disney", color: "#1E88E5", bgColor: "#FFFFFF" },
  { name: "Paw Patrol", color: "#2196F3", bgColor: "#FFFFFF" },
  { name: "Thomas & Friends", color: "#4CAF50", bgColor: "#FFFFFF" },
  { name: "Peppa Pig", color: "#FF69B4", bgColor: "#FFFFFF" }
];

// Function to create SVG logo
function createSVGLogo(brand) {
  const width = 200;
  const height = 80;
  const fontSize = brand.name.length > 10 ? 14 : 18;
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${width}" height="${height}" fill="${brand.bgColor}" stroke="${brand.color}" stroke-width="2" rx="8"/>
  <text x="${width/2}" y="${height/2}" 
        text-anchor="middle" 
        dominant-baseline="central" 
        fill="${brand.color}" 
        font-family="Arial, sans-serif" 
        font-size="${fontSize}" 
        font-weight="bold">${brand.name}</text>
</svg>`;
}

// Function to generate all logos
async function generateAllLogos() {
  console.log('🎨 Generating local SVG logos...\n');
  
  const results = {
    successful: [],
    failed: []
  };
  
  for (const brand of brands) {
    const filename = `${brand.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-logo.svg`;
    const filepath = path.join(uploadsDir, filename);
    
    // Skip if file already exists
    if (fs.existsSync(filepath)) {
      console.log(`⏭️  ${brand.name} logo already exists, skipping...`);
      results.successful.push({ name: brand.name, filename });
      continue;
    }
    
    try {
      const svgContent = createSVGLogo(brand);
      fs.writeFileSync(filepath, svgContent);
      console.log(`✅ Generated ${brand.name} logo`);
      results.successful.push({ name: brand.name, filename });
      
    } catch (error) {
      console.error(`❌ Failed to generate ${brand.name}: ${error.message}`);
      results.failed.push({ name: brand.name, error: error.message });
    }
  }
  
  // Print summary
  console.log('\n📊 Generation Summary:');
  console.log(`✅ Successful: ${results.successful.length}`);
  console.log(`❌ Failed: ${results.failed.length}`);
  
  if (results.successful.length > 0) {
    console.log('\n🎉 Successfully generated:');
    results.successful.forEach(item => console.log(`   • ${item.name}`));
  }
  
  if (results.failed.length > 0) {
    console.log('\n💥 Failed generations:');
    results.failed.forEach(item => console.log(`   • ${item.name}`));
  }
  
  console.log(`\n📁 Files saved to: ${uploadsDir}`);
  
  // Generate updated component
  generateUpdatedComponent(results.successful);
}

// Generate updated component code
function generateUpdatedComponent(successfulLogos) {
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
  
  // Check if LEGO exists from previous download
  const legoExists = fs.existsSync(path.join(uploadsDir, 'lego-logo.png'));
  if (legoExists) {
    existingLogos.push({
      name: "LEGO",
      logo: "/lovable-uploads/lego-logo.png",
      alt: "LEGO - Building blocks and construction toys"
    });
  }
  
  // New generated logos
  const newLogos = successfulLogos
    .filter(item => item.name !== 'LEGO' || !legoExists) // Avoid duplicating LEGO
    .map(item => ({
      name: item.name,
      logo: `/lovable-uploads/${item.filename}`,
      alt: `${item.name} - ${getAltText(item.name)}`
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
  console.log('3. The logos are clean SVG files that will scale perfectly');
  console.log('4. You can later replace any of these with real brand logos');
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
  generateAllLogos().catch(error => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
}

export { generateAllLogos }; 