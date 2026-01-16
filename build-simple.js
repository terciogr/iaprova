const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

async function build() {
  try {
    // Ensure dist directory exists
    if (!fs.existsSync('dist')) {
      fs.mkdirSync('dist');
    }
    
    // Copy static files to dist
    if (fs.existsSync('public')) {
      const copyRecursiveSync = (src, dest) => {
        const exists = fs.existsSync(src);
        const stats = exists && fs.statSync(src);
        const isDirectory = exists && stats.isDirectory();
        if (isDirectory) {
          if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest);
          }
          fs.readdirSync(src).forEach((childItemName) => {
            copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
          });
        } else {
          fs.copyFileSync(src, dest);
        }
      };
      
      // Copy all files from public to dist
      fs.readdirSync('public').forEach(item => {
        const src = path.join('public', item);
        const dest = path.join('dist', item);
        copyRecursiveSync(src, dest);
      });
    }
    
    // Create routes.json
    const routes = {
      version: 1,
      include: ["/*"],
      exclude: ["/static/*", "/*.txt", "/*.html", "/*.js", "/*.css"]
    };
    fs.writeFileSync('dist/_routes.json', JSON.stringify(routes, null, 2));
    
    console.log('✅ Build simples concluído! Arquivos estáticos copiados para dist/');
    console.log('Use: npx wrangler pages dev dist --ip 0.0.0.0 --port 3000');
  } catch (error) {
    console.error('Erro no build:', error);
    process.exit(1);
  }
}

build();