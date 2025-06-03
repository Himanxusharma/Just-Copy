const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [16, 48, 128];
const svgPath = path.join(__dirname, 'icons', 'icon.svg');
const svgBuffer = fs.readFileSync(svgPath);

async function generateIcons() {
    for (const size of sizes) {
        await sharp(svgBuffer)
            .resize(size, size)
            .png()
            .toFile(path.join(__dirname, 'icons', `icon${size}.png`));
        console.log(`Generated icon${size}.png`);
    }
}

generateIcons().catch(console.error); 