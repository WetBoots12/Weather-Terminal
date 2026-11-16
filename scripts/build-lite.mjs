// Builds dist-lite/: a copy of app/ that starts in Lite mode (window.GS_LITE), used by the
// "GOES-STAR Lite" desktop build (src-tauri/tauri.lite.conf.json). app/ itself is untouched.
import { cpSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
const out = 'dist-lite/';
rmSync(out, { force: true, recursive: true });
cpSync('app', out, { recursive: true });
const f = out + 'index.html';
let h = readFileSync(f, 'utf8');
if (!h.includes("<title>GOES-STAR // COMMAND</title>")) throw new Error('index.html layout changed: cannot inject the Lite flag');
h = h.replace("<title>GOES-STAR // COMMAND</title>", "<title>GOES-STAR // LITE</title>\n<script>window.GS_LITE=true;</script>");
writeFileSync(f, h);
console.log('built', out, '(Lite mode)');
