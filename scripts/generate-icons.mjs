import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconsDir = join(__dirname, '../public/icons');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

const svgContent = readFileSync(join(iconsDir, 'icon-base.svg'), 'utf8');

async function generateIcons() {
  console.log('🎨 Gerando ícones PWA do IAprova...\n');
  
  for (const size of sizes) {
    const outputPath = join(iconsDir, `icon-${size}x${size}.png`);
    
    await sharp(Buffer.from(svgContent))
      .resize(size, size)
      .png()
      .toFile(outputPath);
    
    console.log(`✅ Gerado: icon-${size}x${size}.png`);
  }
  
  // Gerar favicon
  await sharp(Buffer.from(svgContent))
    .resize(32, 32)
    .png()
    .toFile(join(iconsDir, 'favicon-32x32.png'));
  console.log('✅ Gerado: favicon-32x32.png');
  
  await sharp(Buffer.from(svgContent))
    .resize(16, 16)
    .png()
    .toFile(join(iconsDir, 'favicon-16x16.png'));
  console.log('✅ Gerado: favicon-16x16.png');
  
  // Gerar apple-touch-icon
  await sharp(Buffer.from(svgContent))
    .resize(180, 180)
    .png()
    .toFile(join(iconsDir, 'apple-touch-icon.png'));
  console.log('✅ Gerado: apple-touch-icon.png');
  
  // Gerar favicon.ico (usando o 32x32)
  await sharp(Buffer.from(svgContent))
    .resize(48, 48)
    .png()
    .toFile(join(iconsDir, 'favicon.png'));
  console.log('✅ Gerado: favicon.png');
  
  console.log('\n🎉 Todos os ícones foram gerados com sucesso!');
}

generateIcons().catch(console.error);
