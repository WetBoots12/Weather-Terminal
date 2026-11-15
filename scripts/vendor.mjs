// Copies third-party libraries into app/vendor so the app runs without CDNs
// (required for the iOS build, which loads everything from the app bundle).
import { cpSync, mkdirSync, rmSync } from 'node:fs';
const nm = 'node_modules/', out = 'app/vendor/';
for (const old of ['three.min.js', 'leaflet.js', 'leaflet.css', 'images']) rmSync(out + old, { force: true, recursive: true });
mkdirSync(out + 'fonts', { recursive: true });
const files = {
  'cesium/Build/Cesium/Cesium.js': 'cesium/Cesium.js',
  'cesium/Build/Cesium/Assets': 'cesium/Assets',
  'cesium/Build/Cesium/ThirdParty': 'cesium/ThirdParty',
  'cesium/Build/Cesium/Widgets': 'cesium/Widgets',
  'cesium/Build/Cesium/Workers': 'cesium/Workers',
  'satellite.js/dist/satellite.min.js': 'satellite.min.js',
  '@fontsource/jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff2': 'fonts/jetbrains-mono-400.woff2',
  '@fontsource/jetbrains-mono/files/jetbrains-mono-latin-700-normal.woff2': 'fonts/jetbrains-mono-700.woff2',
  '@fontsource/inter/files/inter-latin-400-normal.woff2': 'fonts/inter-400.woff2',
  '@fontsource/inter/files/inter-latin-600-normal.woff2': 'fonts/inter-600.woff2',
  '@fontsource/inter/files/inter-latin-700-normal.woff2': 'fonts/inter-700.woff2'
};
for (const [src, dst] of Object.entries(files)) cpSync(nm + src, out + dst, { recursive: true });
console.log('vendored', Object.keys(files).length, 'items into', out);
