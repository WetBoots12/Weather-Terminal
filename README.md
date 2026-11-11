# GOES-STAR // COMMAND (Weather Terminal)

Terminal-styled weather dashboard: 3D satellite globe, animated GOES imagery, NWS forecasts, and NEXRAD radar.
Runs as a static web app (`app/`), as an iPhone/iPad app (Capacitor wrapper in `ios/`), and as a Windows and macOS
desktop app (Tauri wrapper in `src-tauri/`). All three load the same `app/` files.

## Install on iPhone / iPad (sideload from Windows, no Mac needed)

1. **Get the .ipa.** Every push that touches the app runs the *iOS build* GitHub Action on a macOS runner.
   Open the repo's **Actions** tab → latest *iOS build* run → download the **GOES-STAR-ipa** artifact and unzip it
   to get `GOES-STAR.ipa`. (You can also start a build with **Run workflow**.)
2. **Install Sideloadly** (sideloadly.io) on Windows, plus the iTunes and iCloud apps it asks for.
3. Plug in the iPhone or iPad with a cable, tap **Trust** on the device, open Sideloadly, drag `GOES-STAR.ipa` in,
   enter your Apple ID, and press **Start**. Sideloadly signs the app with your Apple ID.
4. On the device: **Settings → General → VPN & Device Management** → tap your Apple ID → **Trust**.
   On iOS 16+ also turn on **Settings → Privacy & Security → Developer Mode** (the phone restarts).
5. Repeat step 3 for the iPad.

With a free Apple ID the app must be re-signed every 7 days (re-run Sideloadly, or enable its auto-refresh).
A paid Apple Developer account extends this to one year.

## Install on Windows

1. Open the repo's **Actions** tab → latest *Windows build* run → download the **GOES-STAR-windows** artifact and unzip it.
2. Run `GOES-STAR_<version>_x64-setup.exe` (installs for your user, no admin needed). The `.msi` in the same
   artifact is an alternative for machine-wide installs.
3. The installer is unsigned, so SmartScreen shows *Windows protected your PC*: click **More info → Run anyway**.

The app uses the Microsoft Edge WebView2 runtime that ships with Windows 10/11; the installer fetches it if missing.
Links such as *View in STAR viewer* and the NWS pages open in your default browser.

## Run the web version

```
npx http-server app -p 8080 -c-1
```
Deploys as-is on Vercel or Netlify (publish directory `app`).

## Developing

- `npm install` then `npm run vendor` copies Three.js, Leaflet, satellite.js and the font into `app/vendor`
  (committed, so the static site needs no build step).
- `npx cap sync ios` copies `app/` into the iOS project. On a Mac, `npx cap open ios` opens it in Xcode.
- Desktop: install Rust (rustup.rs), then `npm run desktop:dev` opens the app in a window and `npm run desktop:build`
  builds installers for the current OS. Shared settings are in `src-tauri/tauri.conf.json`; per-OS settings are in
  `src-tauri/tauri.windows.conf.json` and `src-tauri/tauri.macos.conf.json`. `npm run desktop:icons` regenerates
  the icons from `app/icon-512.png`.

## Data sources

NOAA STAR CDN (GOES-19/18 imagery) · api.weather.gov (forecasts, alerts, observations, radar stations) ·
Nominatim/OpenStreetMap (location search) · RainViewer and Iowa Environmental Mesonet (radar loop, composite,
echo tops, single-site velocity) · NOAA MRMS (composite reflectivity) · CelesTrak (satellite orbits) · CARTO basemap.
