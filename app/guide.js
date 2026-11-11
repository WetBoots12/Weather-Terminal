/* ═══════════════════════ FIELD MANUAL ═══════════════════════
   In-app how-to guide for every tab and tool. Content is drawn from
   NOAA/NWS, NESDIS, CIRA/RAMMB, CIMSS and NASA SPoRT training material;
   numbered refs point at GUIDE_SOURCES (shown on the SOURCES page). */
(function(){
var S=[ /* [title, url] */
 ['NOAA JetStream — Radar Images: Reflectivity','https://www.noaa.gov/jetstream/reflectivity'],
 ['NOAA JetStream — Radar Images: Velocity','https://www.noaa.gov/jetstream/velocity'],
 ['NWS Birmingham — Key Radar Indicators of Severe Weather','https://www.weather.gov/bmx/radar_aboutnwsradar_keyindicators'],
 ['NWS Louisville — Enhanced Echo Tops','https://www.weather.gov/lmk/nws_radar_echo_tops'],
 ['NWS — GOES-16 Band and Product Guides (CRP)','https://www.weather.gov/media/crp/GOES_16_Guides_FINALBIS.pdf'],
 ['NOAA/NESDIS — ABI Band Quick Guides (Bands 1-16)','https://www.goes.noaa.gov/documents/ABIQuickGuide_Band13.pdf'],
 ['CIRA — GeoColor Quick Guide','https://www.weather.gov/media/crp/QuickGuide_CIRA_Geocolor_20171019.pdf'],
 ['NASA SPoRT — Air Mass RGB Quick Guide','https://goes.noaa.gov/documents/QuickGuide_GOESR_AirMassRGB_final.pdf'],
 ['Sandwich Product Quick Guide','https://www.goes.noaa.gov/documents/SandwichProduct.pdf'],
 ['NASA SPoRT — Fire Temperature RGB Quick Guide','https://goes.noaa.gov/documents/QuickGuide_Fire_Temperature_RGB.pdf'],
 ['NASA SPoRT — Dust RGB Quick Guide','https://www.goes.noaa.gov/documents/QuickGuide_Dust_RGB.pdf'],
 ['NOAA/STAR — Day Night Cloud Micro Combo Quick Guide','https://goes.noaa.gov/documents/ABIQuickGuide_DayNightCloudMicroCombo.pdf'],
 ['NOAA/NESDIS — GLM Quick Guides (Rudlosky, 2019)','https://goes.noaa.gov/documents/GLM_Quick_Guides_May_2019.pdf'],
 ['NOAA/NESDIS — Joint Polar Satellite System','https://www.nesdis.noaa.gov/our-satellites/currently-flying/joint-polar-satellite-system'],
 ['NOAA JetStream — Air Pressure','https://www.noaa.gov/jetstream/atmosphere/air-pressure'],
 ['NWS La Crosse — Why Dew Point vs. Humidity','https://www.weather.gov/arx/why_dewpoint_vs_humidity'],
 ['NOAA GOES — ABI Spectral Attributes and Products','https://www.goes.noaa.gov/abispectralattributes.php'],
 ['RAMMB/CIRA — VISIT Satellite Quick Guides index','https://rammb.cira.colostate.edu/training/visit/quick_guides/'],
 ['NOAA JetStream — Radar Beams','https://www.noaa.gov/jetstream/radar-beams']
];
function r(){return ' <sup class="g-ref">['+Array.prototype.join.call(arguments,',')+']</sup>';}

/* Per-band notes: shown under the SPECTRAL BAND selector and in the manual */
var BANDS={
 GEOCOLOR:['GeoColor — True Color','Daytime: approximates what the eye would see (blue, red and near-IR bands with a synthetic green). Night: infrared clouds over a static city-lights map; low liquid clouds are tinted light blue, high ice clouds gray-white.'+r(7),'Fog and low stratus (light blue at night), smoke (tan to bluish gray), storm structure, snow cover. City lights are a fixed background, so they do not show power outages. Colors shift near sunrise and sunset.'+r(7)],
 AirMass:['Air Mass RGB','Water vapor and ozone channels combined to show upper-tropospheric air masses and jet streams.'+r(8),'Dark red/orange = dry, ozone-rich descending stratospheric air along jet streams and potential-vorticity anomalies, a sign of cyclogenesis. Green = warm air mass; dark blue/purple = cold air mass; white = high thick cloud. Blue/violet along the disk edge is limb effect, not cold air. Says nothing directly about surface conditions.'+r(8)],
 Sandwich:['Sandwich RGB','Visible Band 3 texture blended with color-enhanced Band 13 cloud-top temperature, so you see shape and coldness together. Daytime only.'+r(9,17),'Overshooting tops (bubbling bumps above the anvil), cold U/V shapes and cold rings, above-anvil plumes. Intense or long-lived (roughly 40+ min) overshooting tops and cold U/V signatures point to a strong updraft and possible severe weather.'+r(9)],
 FireTemperature:['Fire Temperature RGB','3.9, 2.2 and 1.6 µm channels; hotter fires light up more channels.'+r(10),'Fire intensity shows as a color ramp: red (warm) → orange → yellow (hot) → near white (very hot). Burn scars are maroon; water clouds blue, ice clouds green. Hot desert ground can look red with no fire present.'+r(10)],
 Dust:['Dust RGB','Split-window infrared differences that separate dust from cloud, day or night.'+r(11),'Pink/magenta = dust by day; low plumes look purple/plum at night and turn pink as they rise. Very thick plumes are purple. Marine stratus can look light purple and mimic dust at night; high cloud hides dust underneath.'+r(11)],
 DayNightCloudMicroCombo:['Day/Night Cloud Micro Combo','Day Cloud Phase Distinction RGB by day, Nighttime Microphysics RGB by night, in one product.'+r(12),'Night: fog = dull aqua to gray and washed out; very low warm cloud = aqua; low cool cloud = bright green; high thin ice = dark blue. Day: low water clouds cyan/lavender, glaciating tops green, thick high ice yellow. The two halves blend at sunrise/sunset; thin radiation fog can blend with the ground.'+r(12)],
 DMW:['Derived Motion Winds','Wind vectors computed by tracking cloud edges and water-vapor features across three consecutive images; heights come from cloud-height retrievals.'+r(5),'Jet stream position and speed, upper-level divergence over storms, low-level flow feeding convection. Coverage exists only where there are trackable features.'+r(5)],
 EXTENT3:['GLM Flash Extent Density','Geostationary Lightning Mapper count of lightning flashes passing through each 2 km grid cell over the period.'+r(13),'Flash rates track updraft strength and storm evolution: rapidly rising counts mean an intensifying storm. Small flash areas cluster in the most intense cores. Gridded GLM is shifted away from the sub-satellite point by parallax, so it will not line up exactly with radar.'+r(13)],
 '01':['Band 1 — Blue 0.47 µm','Daytime visible, 1 km. Most sensitive band to aerosols.'+r(5,6),'Smoke, haze and dust (easiest to see with a low sun in forward scatter). Daytime only.'+r(6)],
 '02':['Band 2 — Red 0.64 µm','Daytime visible at 0.5 km, the sharpest ABI band.'+r(5,6),'Cumulus fields and boundaries where storms fire first, outflow boundaries, overshooting tops, river-valley fog, snow, volcanic ash, hurricane eyes. Daytime only.'+r(6)],
 '03':['Band 3 — Veggie 0.86 µm','Near-IR, 1 km. Strong contrast between land, water and vegetation.'+r(5,6),'Flooding, burn scars, hail swaths left across crops. Daytime only.'+r(5)],
 '04':['Band 4 — Cirrus 1.37 µm','Near-IR, 2 km. Sees only high clouds because water vapor absorbs the signal from below.'+r(6),'Very thin cirrus that other bands miss; volcanic ash. Surface is hidden in moist air. Daytime only.'+r(5,6)],
 '05':['Band 5 — Snow/Ice 1.6 µm','Near-IR, 1 km. Water clouds bright, ice clouds and snow dark.'+r(6),'Snow cover vs. cloud, whether storm tops have glaciated (gone dark), hot fires at night.'+r(6)],
 '06':['Band 6 — Cloud Particle Size 2.24 µm','Near-IR, 2 km. Small particles bright, large particles dark.'+r(6),'Cloud phase and particle size (icing threat), snow, very hot fires.'+r(5,6)],
 '07':['Band 7 — Shortwave IR 3.9 µm','Infrared, 2 km, day and night.'+r(6),'Fire hot spots, fog and low stratus at night (paired with the 11.2 µm band), volcanic ash. Daytime sunlight adds to the signal; very small fires can be missed at 2 km.'+r(5,6)],
 '08':['Band 8 — Upper-Level WV 6.2 µm','Water vapor near ~340 mb.'+r(5),'Jet streams, troughs and ridges, turbulence signatures. Dark = dry air aloft. Cooler near the disk edge (limb cooling).'+r(6)],
 '09':['Band 9 — Mid-Level WV 6.9 µm','Water vapor near ~440 mb.'+r(5),'Jet streams, vorticity centers (spinning features), turbulence, contrails.'+r(6)],
 '10':['Band 10 — Lower-Level WV 7.3 µm','Water vapor near ~615 mb; sees down to roughly 500-750 hPa in clear air.'+r(5,6),'Dry slots wrapping into storms, elevated mixed layers, fronts, downslope winds, lake-effect bands, SO2 plumes.'+r(5,6)],
 '11':['Band 11 — Cloud-Top Phase 8.4 µm','Infrared, used in differences with 11.2 and 12.3 µm.'+r(5,6),'Ice vs. water cloud tops, volcanic SO2, dust.'+r(5)],
 '12':['Band 12 — Ozone 9.6 µm','Infrared ozone absorption band.'+r(5,6),'Tropopause dynamics, stratospheric intrusions, PV anomalies (it feeds the Air Mass RGB). Cannot measure ozone at the surface.'+r(5,6)],
 '13':['Band 13 — Clean Longwave IR 10.3 µm','The main day/night infrared band; cloud-top temperature, 2 km.'+r(6),'Coldest tops = tallest storms. Enhanced-V and thermal couplet patterns on storm tops are associated with storms that are producing, or will within ~20-30 min, damaging wind, large hail or tornadoes. Hurricane intensity. Values are not surface air temperature.'+r(6)],
 '14':['Band 14 — Longwave IR 11.2 µm','The traditional IR window, similar to older GOES 10.7 µm.'+r(6),'Cloud-top temperature; difference with 3.9 µm for fog and low stratus.'+r(5,6)],
 '15':['Band 15 — Dirty Longwave 12.3 µm','IR window more sensitive to low-level moisture.'+r(5,6),'Low-level moisture and precipitable water; split-window difference with 10.3 µm for dust such as the Saharan Air Layer.'+r(6)],
 '16':['Band 16 — CO2 Longwave 13.3 µm','Infrared band tied to mean tropospheric temperature.'+r(5),'Cloud-top heights, tropopause, ash. Strong limb cooling; mostly an ingredient for products rather than a band to view alone.'+r(6)]
};

/* Uppercase in JS but keep the micro sign (CSS uppercase turns µm into MM) */
function upMu(t){return t.split('µm').map(function(x){return x.toUpperCase();}).join('µm');}
function bandRows(keys){return keys.map(function(k){var b=BANDS[k];return '<div class="g-card"><div class="g-card-hd" style="text-transform:none">'+upMu(b[0])+'</div><p><span class="g-k">WHAT IT IS</span> '+b[1]+'</p><p><span class="g-k">LOOK FOR</span> '+b[2]+'</p>'+(window.goesLegendHTML?window.goesLegendHTML(k):'')+'</div>';}).join('');}

var PAGES={
 overview:{t:'OVERVIEW',h:function(){return ''+
  '<h3>HOW THE TERMINAL IS ORGANIZED</h3>'+
  '<p>Each tab along the top is a separate instrument. The <b>sidebar</b> (☰ on a phone) holds that tab\'s controls, the large area on the right is the display, and the <b>status bar</b> under the header shows the feed state and source. The clock runs in UTC because satellite and radar timestamps are in UTC.</p>'+
  '<h3>A TYPICAL WORKFLOW</h3>'+
  '<ol><li><b>NWS GROUND</b> — search your location first. Read any alerts, then the forecast. This also sets the location the Radar tab centers on.</li>'+
  '<li><b>LIVE IMAGERY</b> — look at the big picture: where the clouds, jet stream and storms are, and how they are moving.</li>'+
  '<li><b>RADAR</b> — zoom in on precipitation and storm structure near you.</li>'+
  '<li><b>3D ORBITAL</b> — see which satellites are looking where, where it is day or night, and when the next scan arrives.</li></ol>'+
  '<p>Forecasters do not trust one product alone. NWS warning guidance stresses that no single radar indicator is used by itself to issue a warning.'+r(3)+' Cross-check satellite, radar and observations before drawing a conclusion.</p>'+
  '<p class="g-dim">Every tab has a <b>? HOW TO USE</b> link in its sidebar that opens this manual at the right page. Bracketed numbers point to the SOURCES page.</p>';}},
 '3d':{t:'3D ORBITAL',h:function(){return ''+
  '<h3>WHAT YOU ARE LOOKING AT</h3>'+
  '<p><b>GOES-19 (East, 75.2°W)</b> and <b>GOES-18 (West, 137.2°W)</b> sit in geostationary orbit 35,786 km up and stare at the same half of the Earth continuously; they supply every image on the Live Imagery tab. The smaller dots are <b>polar orbiters</b>: NOAA-20, NOAA-21 and Suomi NPP (the U.S. JPSS fleet) and Europe\'s MetOp-B/C. JPSS satellites circle pole to pole about 14 times a day, covering the whole globe twice daily, and provide most of the data that feeds U.S. numerical weather prediction.'+r(14)+'</p>'+
  '<h3>HOW TO USE IT</h3>'+
  '<ul><li><b>Drag</b> to rotate, <b>scroll or pinch</b> to zoom, <b>hover or tap</b> a satellite for its name and position.</li>'+
  '<li>The shaded <b>terminator</b> marks day and night. Visible bands, GeoColor\'s true-color mode, Sandwich and the Day Cloud Phase half of the Cloud Micro Combo only work on the sunlit side.</li>'+
  '<li><b>SCAN SCHEDULE</b> counts down to the next Full Disk (10 min), CONUS/PACUS (5 min) and Mesoscale (1 min) scan. Imagery appears a few minutes after a scan completes, so syncing right at zero may return the previous frame.</li>'+
  '<li><b>OVERLAY DISK</b>: load a Full Disk on Live Imagery, come back here, and drape the latest image on the globe.</li>'+
  '<li><b>VIEW ON GLOBE</b> (NWS Ground) drops a red pin at your forecast location.</li></ul>'+
  '<h3>WHAT TO KEEP IN MIND</h3>'+
  '<p>Geostationary satellites see high latitudes and the disk edge at a steep slant. Features there are stretched, and infrared and water-vapor bands read colder near the edge (limb cooling), up to several degrees.'+r(6,8)+' Lightning and cloud-top features are displaced from their true ground position by parallax, so they will not line up exactly with radar.'+r(13)+'</p>';}},
 loops:{t:'LIVE IMAGERY',h:function(){return ''+
  '<h3>HOW TO USE IT</h3>'+
  '<ol><li>Pick a <b>SATELLITE / SECTOR</b>. GOES-East covers the eastern and central U.S. and Atlantic; GOES-West covers the West, Alaska, Hawaii and the Pacific. Full Disk shows the whole hemisphere; regional sectors give more detail.</li>'+
  '<li>Pick a <b>SPECTRAL BAND</b> or RGB composite. A short note on what it shows appears under the menu, and a <b>COLOR KEY</b> in the lower-left of the image explains what each color means (tap its header to hide or show it). Every band card below carries the same key.</li>'+
  '<li>Choose <b>ANIMATION FRAMES</b> and press <b>SYNC LATEST IMAGE</b>. More frames show longer trends; fewer load faster.</li>'+
  '<li>Leave <b>AUTO-REFRESH</b> on to pull new frames as scans arrive. <b>EMERGENCY SYSTEM RESET</b> clears a stuck loop.</li></ol>'+
  '<h3>WHY LOOP?</h3>'+
  '<p>Motion is the key information. In a loop, watch whether storms are growing (tops spreading and cooling) or decaying, which way the jet stream and dry slots are moving, and where new clouds are forming along boundaries.</p>'+
  '<h3>WHICH BAND FOR WHICH JOB</h3>'+
  '<table class="g-tbl"><tr><th>QUESTION</th><th>START WITH</th></tr>'+
  '<tr><td>Where will storms form today?</td><td>Band 2 visible (cumulus lines, boundaries), then Band 13</td></tr>'+
  '<tr><td>How strong is this storm?</td><td>Band 13 / Sandwich (cold, overshooting tops), GLM flashes</td></tr>'+
  '<tr><td>Jet stream, troughs, big-picture pattern</td><td>Air Mass RGB, Bands 8-10 water vapor</td></tr>'+
  '<tr><td>Fog or low clouds at night</td><td>Day/Night Cloud Micro Combo, GeoColor</td></tr>'+
  '<tr><td>Wildfires and smoke</td><td>Fire Temperature RGB, Band 7, Band 1 / GeoColor for smoke</td></tr>'+
  '<tr><td>Blowing dust</td><td>Dust RGB</td></tr>'+
  '<tr><td>Snow cover vs. cloud</td><td>Band 5, Day Cloud Phase (daytime)</td></tr></table>'+
  '<h3>RGB COMPOSITES</h3>'+bandRows(['GEOCOLOR','AirMass','Sandwich','FireTemperature','Dust','DayNightCloudMicroCombo','DMW','EXTENT3'])+
  '<h3>THE 16 ABI BANDS</h3><p class="g-dim">Bands 1-6 measure reflected sunlight (daytime only). Bands 7-16 measure infrared emission and work day and night: 8-10 show water vapor at three heights; 13-15 are "window" bands that see cloud tops or the ground.'+r(5)+'</p>'+
  bandRows(['01','02','03','04','05','06','07','08','09','10','11','12','13','14','15','16']);}},
 nws:{t:'NWS GROUND',h:function(){return ''+
  '<h3>HOW TO USE IT</h3>'+
  '<ol><li>Type a ZIP code, city or state, pick a match, and press <b>ACQUIRE FORECAST</b>. U.S. locations only (data from api.weather.gov).</li>'+
  '<li>Use <b>IMPERIAL / METRIC</b> to switch units. <b>AUTO-REFRESH</b> keeps the data current; <b>CLEAR STATION</b> resets.</li>'+
  '<li><b>Tap</b> the current-conditions box, any hourly or 7-day card, or an alert to expand the full text.</li>'+
  '<li>The location you pick also centers the <b>RADAR</b> tab and can be pinned on the 3D globe.</li></ol>'+
  '<h3>READ IN THIS ORDER</h3>'+
  '<ol><li><b>Alerts</b> (orange box): watches, warnings and advisories issued by your local NWS office. Expand and read the full text.</li>'+
  '<li><b>Current conditions</b>, then the <b>48-hour outlook</b> for timing, then the <b>7-day forecast</b> for the trend.</li>'+
  '<li>The <b>48-hour graphs</b> to see how the ingredients change together.</li></ol>'+
  '<h3>WHAT TO LOOK FOR IN THE GRAPHS</h3>'+
  '<div class="g-card"><div class="g-card-hd">DEW POINT</div><p>The temperature air must cool to before it is saturated (100% humidity). It measures how much moisture is actually in the air, so it is a better comfort gauge than relative humidity. In summer: 55°F or lower feels dry and comfortable, 55-65°F gets sticky, 65°F and up is oppressive.'+r(16)+'</p><p>When the temperature and dew point lines come together, humidity approaches 100%; overnight that is when fog and low cloud become likely.</p></div>'+
  '<div class="g-card"><div class="g-card-hd">HUMIDITY</div><p>Relative humidity rises at night and falls in the afternoon even when moisture stays the same, because it depends on temperature. Use dew point to judge real moisture changes.'+r(16)+'</p></div>'+
  '<div class="g-card"><div class="g-card-hd">BAROMETRIC PRESSURE</div><p>Large pressure changes come from passing high and low pressure systems. Falling pressure signals an approaching low and worsening weather; a sudden fall signals strong wind. Pressure also has a small daily cycle (highest near 10 a.m./p.m., lowest near 4 a.m./p.m.), so ignore small wiggles and look at the multi-hour trend. Standard sea-level pressure is 1013.25 hPa (29.92 inHg).'+r(15)+'</p></div>'+
  '<div class="g-card"><div class="g-card-hd">WIND DIRECTION / SPEED</div><p>Direction is where the wind blows <i>from</i>. A sharp wind shift accompanied by a drop in dew point and temperature marks a front or outflow passing through.</p></div>'+
  '<div class="g-card"><div class="g-card-hd">SKY COVER &amp; TEMPERATURE</div><p>Clear, calm nights cool fastest; cloud cover holds heat in. Compare sky cover with the temperature curve to see why a night is forecast mild or cold.</p></div>';}},
 radar:{t:'RADAR',h:function(){return ''+
  '<h3>HOW TO USE IT</h3>'+
  '<ol><li>Set a location on <b>NWS GROUND</b> first; the radar centers on it.</li>'+
  '<li><b>NATIONAL</b> shows the U.S. mosaic; <b>LOCAL</b> zooms to your location.</li>'+
  '<li><b>◎ STATIONS</b> shows every NEXRAD site as a diamond. Tap one to select it; the active station is filled. Velocity needs a station.</li>'+
  '<li>Choose a product, then <b>▶ PLAY LOOP</b> in the sidebar to animate. Watch storm motion and whether cores strengthen or weaken.</li></ol>'+
  '<h3>PRODUCTS</h3>'+
  '<div class="g-card"><div class="g-card-hd">BASE REFL — BASE REFLECTIVITY</div><p>Echo strength from the lowest radar tilt (0.5°). Updates fastest (as often as every ~90 s) and is the best view of low-level structure: <b>hook echoes</b> and <b>outflow boundaries</b> show up here. It can miss the strongest part of a storm aloft and storms forming close to the radar.'+r(1)+'</p></div>'+
  '<div class="g-card"><div class="g-card-hd">COMP REFL — COMPOSITE REFLECTIVITY</div><p>The highest reflectivity found at any height. Good for judging overall storm intensity and catching hail cores aloft, but it often hides hook echoes and boundaries, and it is only complete after the full volume scan (4-7 minutes).'+r(1)+'</p></div>'+
  '<div class="g-card"><div class="g-card-hd">VELOCITY — BASE RADIAL VELOCITY</div><p>Wind toward or away from the selected radar at the lowest tilt. <b>Green = toward the radar, red = away.</b> Only the part of the wind along the beam is measured, so wind crossing the beam reads zero; the zero line (zero isodop) shows where the wind blows perpendicular to the beam.'+r(2)+'</p>'+
  '<p><span class="g-k">LOOK FOR</span> a tight <b>couplet</b> of strong green next to strong red: rotation. If a couplet persists 10+ minutes and appears at several heights, tornado formation is possible.'+r(2,3)+' Broad areas of very strong inbound or outbound winds mark damaging straight-line winds (bow echoes, derechos).'+r(1,2)+' This is base velocity, not storm-relative: storm motion is not subtracted, so a fast-moving storm can mask its couplet.'+r(2)+'</p></div>'+
  '<div class="g-card"><div class="g-card-hd">ECHO TOPS</div><p>Estimated height of the top of the precipitation. Use it to find the tallest and fastest-growing storms and follow their trends; NWS notes it is less critical for severe weather than reflectivity and velocity.'+r(4)+'</p></div>'+
  '<h3>READING THE dBZ SCALE</h3>'+
  '<table class="g-tbl"><tr><th>dBZ</th><th>MEANING</th><th>RAIN RATE</th></tr>'+
  '<tr><td>20-40</td><td>Light precipitation</td><td>trace - 0.45 in/hr</td></tr>'+
  '<tr><td>40-50</td><td>Moderate precipitation</td><td>0.45 - 1.9 in/hr</td></tr>'+
  '<tr><td>50-65</td><td>Heavy precipitation or some hail</td><td>1.9 - 16 in/hr</td></tr>'+
  '<tr><td>65+</td><td>Extremely heavy, water-coated hail likely</td><td>16+ in/hr</td></tr></table>'+
  '<p class="g-dim">Below 20 dBZ is very light precipitation or clutter. Rain rates are typical values; hail inflates them.'+r(1)+'</p>'+
  '<h3>SEVERE STORM SIGNATURES</h3>'+
  '<ul><li><b>Hook echo</b> — a hook on the south or southwest side of a supercell; the storm has obtained rotation. Tornadoes often sit at the tip, but a hook does not mean a tornado is on the ground.'+r(1,3)+'</li>'+
  '<li><b>Bow echo</b> — a line segment bulging outward; damaging winds are likely at the apex.'+r(1)+'</li>'+
  '<li><b>Three-body scatter spike (hail spike)</b> — a faint spike of weak echo extending away from the radar behind a very strong core; a direct radar indicator of large hail.'+r(3)+'</li>'+
  '<li><b>Outflow boundary</b> — a thin line of weak echo moving away from storms. New storms often form along it, and storms crossing it can gain rotation.'+r(3)+'</li>'+
  '<li><b>Rotational couplet</b> — see Velocity above.</li></ul>'+
  '<h3>LIMITATIONS</h3>'+
  '<p>The beam rises and spreads as it travels: about 1,000 ft wider every 10 miles, and roughly 11,600 ft above the ground 98 miles out. Distant storms are sampled high up, low-level rotation is missed and small features blur, so select the station closest to the storm. Unusual temperature layers can bend the beam to the ground and create false echoes (anomalous propagation).'+r(19)+' Close to the radar, the lowest tilt passes under the upper part of storms.'+r(1)+'</p>'+
  '<p class="g-dim">Data: RainViewer and Iowa Environmental Mesonet mosaics (reflectivity, echo tops), NWS RIDGE single-site velocity.</p>';}},
 sources:{t:'SOURCES',h:function(){return '<h3>SOURCES</h3><p class="g-dim">Primary NOAA/NWS and university training material. Opens in a browser.</p><ol class="g-src">'+S.map(function(s){return '<li><a href="'+s[1]+'" target="_blank" rel="noopener">'+s[0]+'</a></li>';}).join('')+'</ol>';}}
};
var ORDER=['overview','3d','loops','nws','radar','sources'];

var css='#guide{position:fixed;inset:0;z-index:2000;background:#050505;display:none;flex-direction:column;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)}'+
'#guide.open{display:flex}'+
'#guide-hd{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 14px;border-bottom:2px solid var(--y);flex-shrink:0}'+
'#guide-hd h2{font-size:13px;font-weight:700;letter-spacing:.04em}'+
'#guide-x{background:transparent;border:1px solid var(--y);color:var(--y);font-family:inherit;font-size:11px;padding:6px 10px;cursor:pointer;min-height:32px}'+
'#guide-nav{display:flex;gap:4px;padding:8px 14px;border-bottom:1px solid var(--ydim2);overflow-x:auto;flex-shrink:0;scrollbar-width:none}'+
'#guide-nav::-webkit-scrollbar{display:none}'+
'#guide-nav button{white-space:nowrap}'+
'#guide-body{flex:1;overflow-y:auto;padding:14px;-webkit-overflow-scrolling:touch;overscroll-behavior:contain}'+
'#guide-body::-webkit-scrollbar{width:4px}#guide-body::-webkit-scrollbar-thumb{background:rgba(255,180,0,.3)}'+
'.g-in{max-width:760px;margin:0 auto;text-transform:none;font-size:12px;line-height:1.65;color:rgba(255,180,0,.88)}'+
'.g-in h3{text-transform:uppercase;font-size:10px;letter-spacing:.08em;color:var(--y);border-bottom:1px solid var(--ydim2);padding-bottom:4px;margin:18px 0 8px}'+
'.g-in h3:first-child{margin-top:0}'+
'.g-in p{margin-bottom:8px}.g-in ol,.g-in ul{margin:0 0 8px 18px}.g-in li{margin-bottom:4px}'+
'.g-in b{color:var(--y)}.g-in a{color:var(--y)}'+
'.g-dim{opacity:.6;font-size:11px}'+
'.g-ref{font-size:8px;opacity:.55;margin-left:1px}'+
'.g-card{border:1px solid rgba(255,180,0,.25);background:rgba(255,180,0,.02);padding:8px 10px;margin-bottom:8px}'+
'.g-card-hd{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px;color:var(--y)}'+
'.g-k{font-size:9px;font-weight:700;letter-spacing:.06em;margin-right:4px;color:var(--y)}'+
'.g-tbl{width:100%;border-collapse:collapse;margin-bottom:8px;font-size:11px}'+
'.g-tbl th{text-align:left;font-size:9px;letter-spacing:.06em;opacity:.6;border-bottom:1px solid var(--ydim2);padding:4px 6px}'+
'.g-tbl td{border-bottom:1px solid var(--ydim3);padding:5px 6px;vertical-align:top}'+
'.g-src li{word-break:break-word}'+
'.guide-btn{padding:4px 10px;border:1px solid var(--ydim);font-size:11px;cursor:pointer;font-family:inherit;text-transform:uppercase;background:transparent;color:var(--y);white-space:nowrap}'+
'.guide-btn:hover{background:var(--ydim3)}'+
'#band-note{font-size:9px;line-height:1.5;color:var(--ydim);text-transform:none;margin:-4px 0 8px;display:none}'+
'#band-note b{color:var(--y);text-transform:uppercase;font-size:8px;letter-spacing:.06em}'+
'@media(max-width:768px){.guide-btn{min-height:36px;padding:6px 9px;font-size:10px}.g-in{font-size:13px}}';

var el,cur='overview';
(function(){var st=document.createElement('style');st.textContent=css;document.head.appendChild(st);})();
function build(){
  el=document.createElement('div');el.id='guide';el.setAttribute('role','dialog');el.setAttribute('aria-label','Field manual');
  el.innerHTML='<div id="guide-hd"><h2>FIELD MANUAL // <span id="guide-t"></span></h2><button id="guide-x" aria-label="Close manual">✕ CLOSE</button></div><div id="guide-nav" class="tabs"></div><div id="guide-body"><div class="g-in" id="guide-in"></div></div>';
  document.body.appendChild(el);
  var nav=el.querySelector('#guide-nav');
  ORDER.forEach(function(k){var b=document.createElement('button');b.className='tab-btn';b.textContent=PAGES[k].t;b.dataset.k=k;b.onclick=function(){show(k)};nav.appendChild(b);});
  el.querySelector('#guide-x').onclick=closeGuide;
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&el.classList.contains('open'))closeGuide();});
}
function show(k){
  cur=PAGES[k]?k:'overview';
  el.querySelector('#guide-t').textContent=PAGES[cur].t;
  el.querySelector('#guide-in').innerHTML=PAGES[cur].h();
  el.querySelectorAll('#guide-nav button').forEach(function(b){b.classList.toggle('active',b.dataset.k===cur);});
  el.querySelector('#guide-body').scrollTop=0;
}
function activeTab(){var v=document.querySelector('.view.active');return v?v.id.replace('view-',''):'overview';}
window.openGuide=function(k){
  if(!el)build();
  var s=document.getElementById('sidebar');
  if(s&&s.classList.contains('mob-open')&&typeof toggleMobSidebar==='function')toggleMobSidebar();
  show(k||activeTab());el.classList.add('open');
};
function closeGuide(){if(el)el.classList.remove('open');}
window.closeGuide=closeGuide;

/* Band note under the SPECTRAL BAND selector */
function updateBandNote(){
  var sel=document.getElementById('bandSel'),n=document.getElementById('band-note');
  if(!sel||!n)return;var b=BANDS[sel.value];
  if(!b){n.style.display='none';return;}
  var strip=function(s){return s.replace(/<sup[^>]*>.*?<\/sup>/g,'');};
  n.innerHTML='<b>WHAT</b> '+strip(b[1])+'<br><b>LOOK FOR</b> '+strip(b[2]);
  n.style.display='block';
}
document.addEventListener('DOMContentLoaded',function(){
  var sel=document.getElementById('bandSel');
  if(sel){sel.addEventListener('change',updateBandNote);updateBandNote();}
});
window.GUIDE_BANDS=BANDS;
})();
