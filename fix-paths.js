// Fixes Expo web export for GitHub Pages hosting
const fs = require('fs');
const path = require('path');
const BASE = '/LuxABD';

// 1. Rename _expo → expo (avoids Jekyll filtering underscore folders)
if (fs.existsSync('dist/_expo')) {
  fs.renameSync('dist/_expo', 'dist/expo');
  console.log('✅ Renamed _expo → expo');
}

// 2. Patch index.html
let html = fs.readFileSync('dist/index.html', 'utf8');
html = html.replace(/src="\/_expo\//g, `src="${BASE}/expo/`);
html = html.replace(/src="\/expo\//g, `src="${BASE}/expo/`);
html = html.replace(/href="\/favicon/g, `href="${BASE}/favicon`);
fs.writeFileSync('dist/index.html', html);
console.log('✅ Paths patched in index.html');

// 3. Create 404.html for SPA routing
fs.copyFileSync('dist/index.html', 'dist/404.html');
console.log('✅ 404.html created');

