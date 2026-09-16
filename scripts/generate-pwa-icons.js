import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const svgPath = path.resolve('public/icon.svg');
const svgBuffer = fs.readFileSync(svgPath);

async function generateIcons() {
  console.log('Generating PWA PNG icons from public/icon.svg...');

  // 1. 192x192 standard icon
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile('public/pwa-192x192.png');
  console.log('Created public/pwa-192x192.png');

  // 2. 512x512 standard icon
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile('public/pwa-512x512.png');
  console.log('Created public/pwa-512x512.png');

  // 3. 180x180 Apple Touch Icon (PNG)
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile('public/apple-touch-icon.png');
  console.log('Created public/apple-touch-icon.png');

  // 4. 512x512 Maskable Icon with 15% safe margin
  // For maskable icons, the core icon is centered inside an 80% circle on a solid #064e3b background
  const innerSize = Math.round(512 * 0.76); // ~389px
  const innerIcon = await sharp(svgBuffer)
    .resize(innerSize, innerSize)
    .toBuffer();

  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 6, g: 78, b: 59, alpha: 1 } // #064e3b
    }
  })
    .composite([
      {
        input: innerIcon,
        top: Math.round((512 - innerSize) / 2),
        left: Math.round((512 - innerSize) / 2)
      }
    ])
    .png()
    .toFile('public/pwa-maskable-512x512.png');
  console.log('Created public/pwa-maskable-512x512.png');

  // 5. 32x32 Favicon
  await sharp(svgBuffer)
    .resize(32, 32)
    .png()
    .toFile('public/favicon-32x32.png');
  console.log('Created public/favicon-32x32.png');

  console.log('All PWA icons generated successfully!');
}

generateIcons().catch((err) => {
  console.error('Error generating PWA icons:', err);
  process.exit(1);
});
