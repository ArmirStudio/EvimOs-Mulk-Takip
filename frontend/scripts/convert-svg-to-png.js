const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function convertLogoSvgToPng() {
  const svgPath = path.join(__dirname, '../assets/images/logo.svg');
  const pngPath = path.join(__dirname, '../assets/images/logo.png');

  try {
    const svgBuffer = fs.readFileSync(svgPath);

    // Render SVG to PNG with 240px width, transparent background
    await sharp(svgBuffer, { density: 300 })
      .resize(240, 80, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png({ quality: 95 })
      .toFile(pngPath);

    console.log('✓ Logo PNG created successfully:', pngPath);
    console.log('  Dimensions: 240x80px');
    console.log('  Format: PNG with transparency');
  } catch (error) {
    console.error('✗ Error converting SVG to PNG:', error.message);
    process.exit(1);
  }
}

convertLogoSvgToPng();
