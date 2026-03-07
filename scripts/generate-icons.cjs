const { Resvg } = require('@resvg/resvg-js');
const fs = require('fs');
const path = require('path');

const svgPath = path.join(__dirname, '../public/icons/icon-base.svg');
const outDir = path.join(__dirname, '../public/icons');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

const svgData = fs.readFileSync(svgPath, 'utf8');

console.log('🎨 Gerando ícones PWA...');

for (const size of sizes) {
  const resvg = new Resvg(svgData, {
    fitTo: {
      mode: 'width',
      value: size
    },
    font: {
      defaultFontFamily: 'Arial',
    },
    dpi: 300,
  });
  
  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();
  
  const outPath = path.join(outDir, `icon-${size}x${size}.png`);
  fs.writeFileSync(outPath, pngBuffer);
  console.log(`  ✅ icon-${size}x${size}.png (${pngBuffer.length} bytes)`);
}

// Apple touch icon (180x180)
const appleResvg = new Resvg(svgData, {
  fitTo: { mode: 'width', value: 180 },
  font: { defaultFontFamily: 'Arial' },
  dpi: 300,
});
const applePng = appleResvg.render().asPng();
fs.writeFileSync(path.join(outDir, 'apple-touch-icon.png'), applePng);
console.log(`  ✅ apple-touch-icon.png (${applePng.length} bytes)`);

// Favicon (32x32 and 16x16)
for (const fSize of [32, 16]) {
  const favResvg = new Resvg(svgData, {
    fitTo: { mode: 'width', value: fSize },
    font: { defaultFontFamily: 'Arial' },
    dpi: 300,
  });
  const favPng = favResvg.render().asPng();
  fs.writeFileSync(path.join(outDir, `favicon-${fSize}x${fSize}.png`), favPng);
  console.log(`  ✅ favicon-${fSize}x${fSize}.png (${favPng.length} bytes)`);
}

// Generic favicon.png (48x48)
const favGenResvg = new Resvg(svgData, {
  fitTo: { mode: 'width', value: 48 },
  font: { defaultFontFamily: 'Arial' },
  dpi: 300,
});
const favGenPng = favGenResvg.render().asPng();
fs.writeFileSync(path.join(outDir, 'favicon.png'), favGenPng);
console.log(`  ✅ favicon.png (${favGenPng.length} bytes)`);

console.log('\n🎉 Todos os ícones gerados com sucesso!');
