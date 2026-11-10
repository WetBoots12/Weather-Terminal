// Copies third-party libraries into app/vendor so the app runs without CDNs
// (required for the iOS build, which loads everything from the app bundle).
import { cpSync, mkdirSync } from 'node:fs';
const nm = 'node_modules/', out = 'app/vendor/';
mkdirSync(out + 'fonts', { recursive: true });
const files = {
  'three/build/three.min.js': 'three.min.js',
  'leaflet/dist/leaflet.js': 'leaflet.js',
  'leaflet/dist/leaflet.css': 'leaflet.css',
  'leaflet/dist/images': 'images',
  'satellite.js/dist/satellite.min.js': 'satellite.min.js',
  '@fontsource/jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff2': 'fonts/jetbrains-mono-400.woff2',
  '@fontsource/jetbrains-mono/files/jetbrains-mono-latin-700-normal.woff2': 'fonts/jetbrains-mono-700.woff2'
};
for (const [src, dst] of Object.entries(files)) cpSync(nm + src, out + dst, { recursive: true });
console.log('vendored', Object.keys(files).length, 'items into', out);
