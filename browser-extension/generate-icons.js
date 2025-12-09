// Simple SVG to PNG icon generator for the extension
const fs = require('fs');
const path = require('path');

// Create a simple SVG icon
const createSvg = (size) => `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="#4CAF50"/>
  <text x="50%" y="50%" font-size="${size * 0.6}" text-anchor="middle" dy=".35em" fill="white">🎭</text>
</svg>`;

// For now, just create placeholder text files since we can't generate images without dependencies
const sizes = [16, 32, 48, 128];
sizes.forEach(size => {
  const svg = createSvg(size);
  fs.writeFileSync(path.join(__dirname, 'icons', `icon${size}.svg`), svg);
});

console.log('Icon SVG files created');
