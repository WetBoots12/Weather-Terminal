/* 3D GLOBE — CesiumJS (vendored in app/vendor/cesium, loaded on first open of the 3D tab).
   Base imagery, labels and terrain: Esri. Radar: IEM NEXRAD composite or RainViewer.
   GOES: NOAA STAR full-disk JPGs reprojected from the ABI fixed grid onto lat/lon in the browser. */
var globeReady=false,_diskOverlayActive=false,_globeKick=function(){globeResize();};
var _G={goesSeq:0,radarSeq:0,v:null,layers:{},radar:[],radarIdx:0,radarTimer:null,goes:[],goesUrls:[],disk:[],diskIdx:-1,ents:{},pending:null,pin:null,cone:[],lut:{},refresh:null};
var _GEO_ALT=0.75*6371000,_LEO_ALT=0.2*6371000; /* stylized altitudes so orbits fit on screen, as before */
/* mode = which weather overlay is on: 'radar' | 'goes' | 'off' (the RADAR / GOES switch) */
var _gOpts={labels:true,terrain:!window.GS_LITE,grid:true,sats:true,light:false,mode:'radar',radar:'libre',loop:false,goes:'GEOCOLOR',goesSat:'both',opacity:75};
try{var _gs=JSON.parse(localStorage.getItem('gs_globe')||'null');if(_gs){if(!_gs.mode)_gs.mode=(_gs.goes&&_gs.goes!=='off')?'goes':(_gs.radar==='off'?'off':'radar');
  if(_gs.radar==='off')delete _gs.radar;if(_gs.radar==='rv')_gs.radar='global';if(_gs.radar==='iem')_gs.radar='bref_qcd';if(_gs.goes==='off')delete _gs.goes;for(var _k in _gs)if(_k in _gOpts)_gOpts[_k]=_gs[_k];}}catch(e){}
function _gSave(){try{localStorage.setItem('gs_globe',JSON.stringify(_gOpts));}catch(e){}}
function _gStatus(t){var el=document.getElementById('glStatus');if(el)el.innerHTML=t;}
function _gRender(){if(_G.v)_G.v.scene.requestRender();}
function globeResize(){if(_G.v){_G.v.resize();_gRender();}}

/* Cesium.js is ~6 MB: start loading it in the background shortly after the app opens,
   so the 3D tab is ready by the time it is clicked. */
var _gLoad=null;
function _gLoadEngine(){
  if(_gLoad)return _gLoad;
  _gLoad=new Promise(function(ok,no){
    if(window.Cesium)return ok();
    window.CESIUM_BASE_URL='vendor/cesium/';
    var css=document.createElement('link');css.rel='stylesheet';css.href='vendor/cesium/Widgets/widgets.css';document.head.appendChild(css);
    var s=document.createElement('script');s.src='vendor/cesium/Cesium.js';s.async=true;s.onload=function(){ok();};s.onerror=function(){_gLoad=null;no();};
    document.head.appendChild(s);
  });
  return _gLoad;
}
if(!window.GS_LITE)window.addEventListener('load',function(){setTimeout(function(){(window.requestIdleCallback||setTimeout)(function(){_gLoadEngine().catch(function(){});});},2500);});
/* Lite: parsing Cesium freezes an older CPU for over a second, so wait until the pointer or keyboard reaches the 3D tab */
else document.addEventListener('DOMContentLoaded',function(){var b=document.querySelector('.tab-btn[onclick*="\'3d\'"]');if(!b)return;
  var go=function(){_gLoadEngine().catch(function(){});};b.addEventListener('pointerenter',go,{once:true});b.addEventListener('focus',go,{once:true});});
function initGlobe(){
  if(globeReady)return;globeReady=true;_gSyncUI();
  if(!window.Cesium)_gStatus('LOADING 3D ENGINE…');
  _gLoadEngine().then(_gBuild,function(){globeReady=false;_gStatus('<span style="color:#ff6644">3D ENGINE FAILED TO LOAD</span>');});
}
/* stop the render loop while another tab is showing */
function globePause(p){if(_G.v){_G.v.useDefaultRenderLoop=!p;if(!p)globeResize();}}

function _gEsri(path,max,credit,min){return new Cesium.UrlTemplateImageryProvider({url:'https://server.arcgisonline.com/ArcGIS/rest/services/'+path+'/MapServer/tile/{z}/{y}/{x}',maximumLevel:max,minimumLevel:min||0,credit:credit});}

function _gBuild(){
  var C=Cesium;
  var v=new C.Viewer('globe-cesium',{
    baseLayer:new C.ImageryLayer(_gEsri('World_Imagery',18,'Imagery: Esri, Maxar, Earthstar Geographics')),
    animation:false,timeline:false,baseLayerPicker:false,geocoder:false,homeButton:false,sceneModePicker:false,
    navigationHelpButton:false,fullscreenButton:false,infoBox:false,selectionIndicator:false,
    requestRenderMode:true,maximumRenderTimeChange:30,shouldAnimate:true,msaaSamples:1
  });
  _G.v=v;var sc=v.scene,gl=sc.globe;
  /* speed: default tile detail, no sibling prefetch, FXAA instead of 4x MSAA */
  gl.maximumScreenSpaceError=IS_TOUCH?2.5:2;gl.tileCacheSize=IS_TOUCH?100:300;gl.preloadSiblings=false;gl.loadingDescendantLimit=10;
  sc.postProcessStages.fxaa.enabled=true;if(IS_TOUCH&&window.devicePixelRatio>2)v.resolutionScale=2/window.devicePixelRatio*1;
  gl.showGroundAtmosphere=true;gl.baseColor=C.Color.fromCssColorString('#0d2d4a');
  sc.backgroundColor=C.Color.BLACK;sc.fog.enabled=true;
  /* Lite: render 75% of the pixels, skip the FXAA pass and the ground-atmosphere and fog shading
     (fog still culls far tiles), and load coarser tiles. About 2x the frame rate when moving the globe. */
  if(window.GS_LITE){v.resolutionScale=.75;sc.postProcessStages.fxaa.enabled=false;gl.showGroundAtmosphere=false;sc.fog.renderable=false;
    gl.maximumScreenSpaceError=3;gl.tileCacheSize=150;gl.loadingDescendantLimit=6;}
  var ctl=sc.screenSpaceCameraController;ctl.minimumZoomDistance=120;ctl.maximumZoomDistance=8e7;
  v.clock.clockStep=C.ClockStep.SYSTEM_CLOCK;v.clock.shouldAnimate=true;
  /* labels + roads (Google Earth style hybrid) */
  _G.layers.places=v.imageryLayers.addImageryProvider(_gEsri('Reference/World_Boundaries_and_Places',18,'Labels: Esri'));
  /* Lite: roads load only once zoomed in to city scale */
  if(window.GS_LITE)v.imageryLayers.add(_G.layers.roads=new C.ImageryLayer(_gEsri('Reference/World_Transportation',18,'Roads: Esri'),{minimumTerrainLevel:7}));
  else _G.layers.roads=v.imageryLayers.addImageryProvider(_gEsri('Reference/World_Transportation',18,'Roads: Esri'));
  /* terrain */
  C.ArcGISTiledElevationTerrainProvider.fromUrl('https://elevation3d.arcgis.com/arcgis/rest/services/WorldElevation3D/Terrain3D/ImageServer')
    .then(function(tp){_G.terrain=tp;_gApplyTerrain();})
    .catch(function(){_G.terrainFailed=true;var el=document.getElementById('glTerrain');if(el){el.checked=false;el.disabled=true;}});
  /* double-click zooms toward the point, like Google Earth */
  v.screenSpaceEventHandler.removeInputAction(C.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
  v.screenSpaceEventHandler.setInputAction(function(e){
    var ray=v.camera.getPickRay(e.position),p=ray&&gl.pick(ray,sc);if(!p)return;
    var c=C.Cartographic.fromCartesian(p),h=v.camera.positionCartographic.height;
    v.camera.flyTo({destination:C.Cartesian3.fromRadians(c.longitude,c.latitude,Math.max(400,h/3)),duration:1});
  },C.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
  /* satellite hover / tap */
  var lastPick=0;
  function pickAt(pos,click){
    var p=sc.pick(pos),tip=document.getElementById('sat-tip');
    var s=p&&p.id&&p.id._sat,st=p&&p.id&&p.id._station;
    if(st){_gHideCone();tip.style.display='block';tip.style.left=(pos.x+16)+'px';tip.style.top=(pos.y+16)+'px';
      tip.innerHTML='<b>NEXRAD '+st[0]+'</b><br>'+_esc(st[1])+'<br>'+(click?'SELECTED':'CLICK TO SELECT');
      v.scene.canvas.style.cursor='pointer';if(click)handleStationSelect(st[0],st[1],st[2],st[3]);return;}
    v.scene.canvas.style.cursor='';
    if(!s){tip.style.display='none';_gHideCone();return;}
    tip.style.display='block';tip.style.left=(pos.x+16)+'px';tip.style.top=(pos.y+16)+'px';
    tip.innerHTML=_gSatTip(s);
    if(s.primary)_gShowCone(s);else _gHideCone();
  }
  v.screenSpaceEventHandler.setInputAction(function(e){var n=Date.now();if(n-lastPick<60)return;lastPick=n;pickAt(e.endPosition);},C.ScreenSpaceEventType.MOUSE_MOVE);
  v.screenSpaceEventHandler.setInputAction(function(e){pickAt(e.position,true);if(IS_TOUCH)setTimeout(function(){document.getElementById('sat-tip').style.display='none';},3000);},C.ScreenSpaceEventType.LEFT_CLICK);
  _gBuildGrid();_gBuildSats();
  /* a saved link (?r=product:STATION) or NWS location restores the radar state */
  var _r0=_radarProduct;_restoreRadarUrl();if(_radarProduct!==_r0&&(RADAR_PRODUCTS[_radarProduct]||G_RADAR[_radarProduct])){_gOpts.radar=_radarProduct;_gSyncUI();}
  loadStationsData();_gRenderStations();
  globeHome(0);
  _gApplyAll();
  if(_pinLat!==null)placeNWSPin(_pinLat,_pinLon);
  if(_G.pending){var pp=_G.pending;_G.pending=null;_gFlyTo(pp[0],pp[1],pp[2]);}
  _G.refresh=setInterval(function(){
    if(document.hidden||!_gVisible())return;
    if(_gOpts.mode==='radar'&&Date.now()-(_G.radarAt||0)>300000)_gRadar(true);
    if(_gOpts.mode==='goes'&&Date.now()-(_G.goesAt||0)>600000)_gGoes();
  },30000);
  setInterval(function(){if(!_gVisible()||document.hidden)return;_gUpdateLEO();_gSunInfo();_gRender();},window.GS_LITE?2000:1000);
  setInterval(function(){if(_diskOverlayActive&&_gVisible())_gDiskTick();},120);
  _gUpdateLEO();_gSunInfo();_gStatus('');
}
function _gVisible(){var w=document.getElementById('globe-wrap');return !!(w&&w.offsetParent!==null);}

/* ── options UI ─────────────────────────────────────────── */
function _gSyncUI(){
  var m={glLabels:'labels',glTerrain:'terrain',glGrid:'grid',glSats:'sats',glLight:'light'};
  for(var id in m){var el=document.getElementById(id);if(el)el.checked=!!_gOpts[m[id]];}
  var r=document.getElementById('glRadar');if(r)r.value=_gOpts.radar;
  var g=document.getElementById('glGoes');if(g)g.value=_gOpts.goes;
  var gs=document.getElementById('glGoesSat');if(gs)gs.value=_gOpts.goesSat;
  var o=document.getElementById('glOpacity');if(o)o.value=_gOpts.opacity;
  document.querySelectorAll('.gl-mode button').forEach(function(b){b.classList.toggle('on',b.dataset.m===_gOpts.mode);});
  var rs=document.getElementById('glRadarBox'),gb=document.getElementById('glGoesBox');
  if(rs)rs.style.display=_gOpts.mode==='radar'?'':'none';if(gb)gb.style.display=_gOpts.mode==='goes'?'':'none';var gbar=document.getElementById('gl-goes-bar');if(gbar)gbar.style.display=_gOpts.mode==='goes'?'flex':'none';
  _gRadarUI();
}
function globeMode(m){if(m===_gOpts.mode)return;_gOpts.mode=m;_gSave();_gSyncUI();if(!_G.v)return;_gRadar();_gGoes();_gRender();}
function globeOpt(k,val){
  _gOpts[k]=(k==='opacity')?parseInt(val):val;_gSave();if(!_G.v)return;
  if(k==='labels'){_G.layers.places.show=_G.layers.roads.show=!!val;}
  else if(k==='terrain')_gApplyTerrain();
  else if(k==='grid')_G.grid.show=!!val;
  else if(k==='sats')_G.sats.show=!!val;
  else if(k==='light'){_G.v.scene.globe.enableLighting=!!val;_G.v.scene.globe.dynamicAtmosphereLighting=!!val;}
  else if(k==='radar')_gRadar();
  else if(k==='goes'||k==='goesSat'){_gGoes();_gKeyUI();}
  else if(k==='opacity')_gApplyOpacity();
  _gRender();
}
function _gApplyAll(){var L=_G.layers;L.places.show=L.roads.show=_gOpts.labels;_G.grid.show=_gOpts.grid;_G.sats.show=_gOpts.sats;
  _G.v.scene.globe.enableLighting=_gOpts.light;_G.v.scene.globe.dynamicAtmosphereLighting=_gOpts.light;_gRadar();_gGoes();}
function _gApplyTerrain(){if(!_G.v)return;_G.v.terrainProvider=(_gOpts.terrain&&_G.terrain)?_G.terrain:new Cesium.EllipsoidTerrainProvider();}
function _gApplyOpacity(){
  var a=_gOpts.opacity/100;
  _G.goes.forEach(function(l){l.alpha=a;l.show=!_diskOverlayActive;});
  /* radar frames stay shown (tiles stay loaded); the loop animates alpha, and Cesium skips alpha-0 layers when drawing */
  var ra=Math.min(1,a+.15);_G.radar.forEach(function(l,i){l.show=!l._pre;l.alpha=(i===_G.radarIdx)?ra:0;});
  if(_diskOverlayActive)_gDiskTick(true);
}
function _gRaise(){/* keep labels above the weather layers */var il=_G.v.imageryLayers;il.raiseToTop(_G.layers.places);il.raiseToTop(_G.layers.roads);}

/* ── camera ─────────────────────────────────────────────── */
function globeHome(dur){if(!_G.v)return;_G.v.camera.flyTo({destination:Cesium.Cartesian3.fromDegrees(-88,28,2.1e7),duration:dur===undefined?1.5:dur});}
function _gFlyTo(lat,lon,h){if(!_G.v){_G.pending=[lat,lon,h];return;}_G.v.camera.flyTo({destination:Cesium.Cartesian3.fromDegrees(lon,lat,h||350000),duration:2});}
async function globeSearch(q){
  q=(q||'').trim();if(!q)return;
  if(!_G.v){initGlobe();}
  _gStatus('SEARCHING "'+_esc(q)+'"…');
  try{
    var m=q.match(/^\s*(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)\s*$/);
    if(m){_gFlyTo(parseFloat(m[1]),parseFloat(m[2]),20000);_gStatus('');return;}
    var r=await fetch('https://nominatim.openstreetmap.org/search?q='+encodeURIComponent(q)+'&format=json&limit=1',{headers:{'Accept-Language':'en-US'}});
    var j=await r.json();if(!j.length){_gStatus('<span style="color:#ff6644">"'+_esc(q)+'" NOT FOUND</span>');return;}
    var b=j[0].boundingbox.map(parseFloat);
    if(_G.v)_G.v.camera.flyTo({destination:Cesium.Rectangle.fromDegrees(b[2],b[0],b[3],b[1]),duration:2});
    else _G.pending=[parseFloat(j[0].lat),parseFloat(j[0].lon),30000];
    _gStatus('● '+_esc(j[0].display_name.split(',').slice(0,3).join(',')));
  }catch(e){_gStatus('<span style="color:#ff6644">SEARCH FAILED</span>');}
}

/* ── graticule ──────────────────────────────────────────── */
function _gBuildGrid(){
  var C=Cesium,ds=new C.CustomDataSource('grid');_G.grid=ds;_G.v.dataSources.add(ds);
  function mat(a){return C.Color.fromCssColorString('#ffb400').withAlpha(a);}
  for(var lat=-80;lat<=80;lat+=10){var p=[];for(var lo=-180;lo<=180;lo+=5)p.push(lo,lat);
    ds.entities.add({polyline:{positions:C.Cartesian3.fromDegreesArray(p),width:1,arcType:C.ArcType.RHUMB,material:mat(lat===0?.5:(lat%30===0?.18:.07))}});}
  for(var lon=-180;lon<180;lon+=10){var q=[];for(var la=-89;la<=89;la+=4)q.push(lon,la);
    ds.entities.add({polyline:{positions:C.Cartesian3.fromDegreesArray(q),width:1,arcType:C.ArcType.GEODESIC,material:mat((lon===0||lon===-180)?.5:(lon%30===0?.18:.07))}});}
}

/* ── satellites ─────────────────────────────────────────── */
function _gHex(c){return typeof c==='number'?'#'+c.toString(16).padStart(6,'0'):c;}
function _gSatIcon(col){
  var cv=document.createElement('canvas');cv.width=52;cv.height=22;var x=cv.getContext('2d');
  x.fillStyle='#1a2e44';x.strokeStyle='#4a6a8a';x.lineWidth=1;
  x.fillRect(1,8,17,6);x.strokeRect(1.5,8.5,16,5);x.fillRect(34,8,17,6);x.strokeRect(34.5,8.5,16,5);
  x.shadowColor=col;x.shadowBlur=6;x.fillStyle=col;x.fillRect(19,5,14,12);
  return cv;
}
function _gBuildSats(){
  var C=Cesium,ds=new C.CustomDataSource('sats');_G.sats=ds;_G.v.dataSources.add(ds);
  var ring=[];for(var lo=-180;lo<=180;lo+=2)ring.push(lo,0,_GEO_ALT);
  ds.entities.add({polyline:{positions:C.Cartesian3.fromDegreesArrayHeights(ring),width:1,arcType:C.ArcType.NONE,material:C.Color.fromCssColorString('#00cfff').withAlpha(.25)}});
  /* NORAD catalog numbers so every satellite, GEO included, is placed from its current CelesTrak TLE */
  var GEO_CAT={'METEOSAT-10':38552,'METEOSAT-12':54743,'HIMAWARI-9':41836,'GK-2A':43823,'FY-4B':48808};
  var list=[{title:'GOES-19 (EAST)',label:'G19-EAST',lon:-75.2,color:'#ffb400',orbit:'GEO',primary:true,agency:'NOAA',cat:60133},
            {title:'GOES-18 (WEST)',label:'G18-WEST',lon:-137.2,color:'#00cfff',orbit:'GEO',primary:true,agency:'NOAA',cat:51850}];
  (window._geoSatDefs||[]).forEach(function(d){list.push({title:d.name,label:d.name,lon:d.lon,color:_gHex(d.color),orbit:'GEO',agency:d.agency,cat:GEO_CAT[d.name]});});
  (window._leoSatDefs||[]).forEach(function(d){list.push({title:d.name,label:d.name,color:_gHex(d.color),orbit:'LEO',agency:d.agency,cat:d.cat,lon:0,lat:0});});
  _G.satList=list;
  list.forEach(function(s){
    var col=C.Color.fromCssColorString(s.color),pos=C.Cartesian3.fromDegrees(s.lon||0,0,s.orbit==='GEO'?_GEO_ALT:_LEO_ALT);
    s.ent=ds.entities.add({position:pos,show:s.orbit==='GEO',
      billboard:{image:_gSatIcon(s.color),scale:s.primary?.9:.7,scaleByDistance:new C.NearFarScalar(2e6,1.3,6e7,.55)},
      label:{text:s.label+(s.primary?' '+Math.abs(s.lon).toFixed(1)+'°'+(s.lon<0?'W':'E'):''),font:'10px "JetBrains Mono", monospace',fillColor:col,outlineColor:C.Color.BLACK,outlineWidth:3,style:C.LabelStyle.FILL_AND_OUTLINE,
        horizontalOrigin:C.HorizontalOrigin.LEFT,verticalOrigin:C.VerticalOrigin.CENTER,pixelOffset:new C.Cartesian2(18,0),scaleByDistance:new C.NearFarScalar(2e6,1.2,6e7,.8)}});
    s.ent._sat=s;
    if(s.orbit==='GEO')s.tie=ds.entities.add({polyline:{positions:[pos,C.Cartesian3.fromDegrees(s.lon,0,0)],width:1,arcType:C.ArcType.NONE,material:col.withAlpha(.3)}});
  });
  _gLoadTLEs();
}
/* TLEs: one CelesTrak "weather" group request (cached 6 h in localStorage, CelesTrak asks clients not to poll faster),
   then single-satellite requests for anything the group lacks. Without a TLE a GEO satellite stays at its nominal slot
   and a polar orbiter is hidden rather than drawn at a made-up position. */
var _TLE_TTL=6*3600e3;
function _gTleCache(){try{return JSON.parse(localStorage.getItem('gs_tle')||'{}');}catch(e){return{};}}
function _gParseTLE(txt,into,at){var l=txt.split(/\r?\n/).map(function(x){return x.trim();}).filter(Boolean);
  for(var i=0;i+2<l.length+1;i++){if(l[i][0]==='1'&&l[i+1]&&l[i+1][0]==='2'){into[parseInt(l[i].slice(2,7))]={l1:l[i],l2:l[i+1],at:at};i++;}}}
function _gApplyTLEs(c){
  (_G.satList||[]).forEach(function(s){var t=c[s.cat];if(!t||!window.satellite)return;try{var sr=satellite.twoline2satrec(t.l1,t.l2);if(sr&&!sr.error){s.satrec=sr;s.tleAt=t.at;}}catch(e){}});
  _gUpdateLEO();_gRender();
}
function _gLoadTLEs(){
  var c=_gTleCache(),now=Date.now();_gApplyTLEs(c);
  var stale=(_G.satList||[]).filter(function(s){return s.cat&&(!c[s.cat]||now-c[s.cat].at>_TLE_TTL);});
  if(!stale.length)return;
  fetch('https://celestrak.org/NORAD/elements/gp.php?GROUP=weather&FORMAT=TLE').then(function(r){if(!r.ok)throw 0;return r.text();}).catch(function(){return'';}).then(function(txt){
    _gParseTLE(txt,c,now);
    var miss=stale.filter(function(s){return !c[s.cat]||c[s.cat].at!==now;});
    return Promise.all(miss.map(function(s){return fetch('https://celestrak.org/NORAD/elements/gp.php?CATNR='+s.cat+'&FORMAT=TLE').then(function(r){return r.ok?r.text():'';}).then(function(t){_gParseTLE(t,c,now);}).catch(function(){});}));
  }).then(function(){try{localStorage.setItem('gs_tle',JSON.stringify(c));}catch(e){}_gApplyTLEs(c);});
}
function _gUpdateLEO(){
  if(!_G.satList||!window.satellite)return;var C=Cesium,now=new Date(),gm=satellite.gstime(now);
  _G.satList.forEach(function(s){
    if(!s.satrec)return;
    try{var pv=satellite.propagate(s.satrec,now);if(!pv||!pv.position)return;var g=satellite.eciToGeodetic(pv.position,gm);
      s.lon=C.Math.toDegrees(C.Math.negativePiToPi(g.longitude));s.lat=C.Math.toDegrees(g.latitude);s.altKm=g.height;
      var p=C.Cartesian3.fromRadians(g.longitude,s.orbit==='GEO'?0:g.latitude,s.orbit==='GEO'?_GEO_ALT:_LEO_ALT);s.ent.position=p;s.ent.show=true;
      if(s.tie)s.tie.polyline.positions=[p,C.Cartesian3.fromRadians(g.longitude,0,0)];
      if(s.primary)s.ent.label.text=s.label+' '+Math.abs(s.lon).toFixed(1)+'°'+(s.lon<0?'W':'E');
    }catch(e){}
  });
}
function _gSatTip(s){
  var ll=function(v,p,n){return Math.abs(v).toFixed(s.orbit==='GEO'?2:1)+'° '+(v<0?n:p);};
  var age=s.tleAt?(Date.now()-s.tleAt)/36e5:null,ep=s.satrec?(Date.now()-(Date.UTC(2000+((s.satrec.epochyr|0)%100),0,1)+(s.satrec.epochdays-1)*864e5))/864e5:null;
  return'<b>'+s.title+'</b><br>'+(s.agency?'AGENCY: '+s.agency+'<br>':'')+'ORBIT: '+(s.orbit==='GEO'?'GEOSTATIONARY':'POLAR (SUN-SYNC)')+
    '<br>LAT: '+ll(s.lat||0,'N','S')+'<br>LON: '+ll(s.lon||0,'E','W')+
    '<br>ALT: '+(s.altKm?Math.round(s.altKm).toLocaleString('en-US'):(s.orbit==='GEO'?'35,786':'—'))+' KM'+
    '<br>POSITION: '+(s.satrec?'LIVE (SGP4, TLE EPOCH '+(ep!==null?ep.toFixed(1)+' D AGO':'—')+')':'NOMINAL SLOT (NO TLE)')+
    (s.primary?'<br>MODE: 6 (10-MIN FLEX)':'');
}
/* field-of-view cone from a GOES satellite to the Earth's limb + true coverage circle on the ground */
function _gShowCone(s){
  if(_G.coneFor===s)return;_gHideCone();_G.coneFor=s;
  var C=Cesium,ents=_G.v.entities,col=C.Color.fromCssColorString(s.color),R=6371000;
  var sat=C.Cartesian3.fromDegrees(s.lon,0,_GEO_ALT),dist=C.Cartesian3.magnitude(sat);
  var axis=C.Cartesian3.negate(C.Cartesian3.normalize(sat,new C.Cartesian3()),new C.Cartesian3());
  var tmp=Math.abs(axis.x)<.9?C.Cartesian3.UNIT_X:C.Cartesian3.UNIT_Y;
  var u=C.Cartesian3.normalize(C.Cartesian3.cross(axis,tmp,new C.Cartesian3()),new C.Cartesian3()),w=C.Cartesian3.cross(axis,u,new C.Cartesian3());
  var half=Math.asin(R/dist),H=dist-R,baseR=Math.tan(half)*H;
  function at(t,ang){var c=C.Cartesian3.add(sat,C.Cartesian3.multiplyByScalar(axis,H*t,new C.Cartesian3()),new C.Cartesian3());
    var off=C.Cartesian3.add(C.Cartesian3.multiplyByScalar(u,Math.cos(ang)*baseR*t,new C.Cartesian3()),C.Cartesian3.multiplyByScalar(w,Math.sin(ang)*baseR*t,new C.Cartesian3()),new C.Cartesian3());
    return C.Cartesian3.add(c,off,new C.Cartesian3());}
  function line(p,a){_G.cone.push(ents.add({polyline:{positions:p,width:1,arcType:C.ArcType.NONE,material:col.withAlpha(a)}}));}
  for(var m=0;m<24;m++)line([sat,at(1,m/24*Math.PI*2)],.35);
  for(var r=1;r<=8;r++){var p=[];for(var i=0;i<=64;i++)p.push(at(r/8,i/64*Math.PI*2));line(p,.3);}
  var cov=Math.acos(6378137/42164160),g=[];
  for(var k=0;k<=128;k++){var b=k/128*Math.PI*2,lat=Math.asin(Math.sin(cov)*Math.cos(b)),lon=s.lon*Math.PI/180+Math.atan2(Math.sin(b)*Math.sin(cov),Math.cos(cov));
    g.push(C.Cartesian3.fromRadians(lon,lat,3000));}
  _G.cone.push(ents.add({polyline:{positions:g,width:2,arcType:C.ArcType.GEODESIC,material:col.withAlpha(.75)}}));
  _gRender();
}
function _gHideCone(){if(!_G.cone.length&&!_G.coneFor)return;_G.cone.forEach(function(e){_G.v.entities.remove(e);});_G.cone=[];_G.coneFor=null;_gRender();}
/* kept for callers in index.html */
function showSatCone(){}function hideSatCone(){_gHideCone();}

/* ── sun ────────────────────────────────────────────────── */
function _gSunInfo(){
  var now=new Date(),n=now.getTime()/864e5+2440587.5-2451545,L=(280.46+.9856474*n)%360,g=((357.528+.9856003*n)%360)*Math.PI/180,
    lam=((L+1.915*Math.sin(g)+.02*Math.sin(2*g))%360)*Math.PI/180,eps=23.439*Math.PI/180,ra=Math.atan2(Math.cos(eps)*Math.sin(lam),Math.cos(lam)),
    dec=Math.asin(Math.sin(eps)*Math.sin(lam))*180/Math.PI,gmst=((280.46061837+360.98564736629*n)%360+360)%360,raD=(ra*180/Math.PI+360)%360,
    sub=((raD-gmst+540)%360-180);
  var el=document.getElementById('sun-info');if(el)el.innerHTML='SUB-SOLAR: '+dec.toFixed(1)+'°N, '+Math.abs(sub).toFixed(1)+'°'+(sub<0?'W':'E')+'<br>EARTH: GMST '+gmst.toFixed(1)+'°';
}

/* ── NWS pin ────────────────────────────────────────────── */
var _pinLat=null,_pinLon=null;
function placeNWSPin(lat,lon){
  removeNWSPin();_pinLat=lat;_pinLon=lon;if(!_G.v)return;
  var C=Cesium,red=C.Color.fromCssColorString('#ff3333');
  _G.pin=[_G.v.entities.add({position:C.Cartesian3.fromDegrees(lon,lat),point:{pixelSize:10,color:red,outlineColor:red.withAlpha(.45),outlineWidth:5,heightReference:C.HeightReference.CLAMP_TO_GROUND,disableDepthTestDistance:5e6}}),
    _G.v.entities.add({polyline:{positions:C.Cartesian3.fromDegreesArrayHeights([lon,lat,0,lon,lat,0.15*6371000]),width:1.5,arcType:C.ArcType.NONE,material:red.withAlpha(.6),depthFailMaterial:red.withAlpha(.25)}})];
  _gRender();
}
function removeNWSPin(){if(_G.pin&&_G.v)_G.pin.forEach(function(e){_G.v.entities.remove(e);});_G.pin=null;_pinLat=null;_pinLon=null;_gRender();}
function flyToNWSPin(){var lat=_pinLat,lon=_pinLon,btn=document.querySelector('.tab-btn[onclick*="\'3d\'"]');if(btn)switchTab('3d',btn);if(lat!==null)_gFlyTo(lat,lon,350000);}

/* ── RADAR (everything the old Radar tab did, now on the globe) ──────────────
   _gOpts.radar = product key. Global/regional mosaics plus the NEXRAD products from RADAR_PRODUCTS
   (index.html). Station products use _radarStation; the NWS tab sets the location via updateRadarLocation(). */
var G_RADAR={
  libre:{name:'OPEN GOV MOSAIC',src:'LIBREWXR (NOAA, ECCC, OPERA, JMA…)',loop:1},
  global:{name:'GLOBAL RADAR',src:'RAINVIEWER',loop:1},
  bref_qcd:{name:'US BASE REFL',src:'NOAA NEXRAD VIA IEM',loop:1},
  eccc:{name:'N. AMERICA RAIN RATE',src:'ENV. CANADA MSC GEOMET',loop:1}
};
function _gRP(k){return G_RADAR[k]||RADAR_PRODUCTS[k]||G_RADAR.libre;}
var _CONUS=null;
function _gConus(){return _CONUS||(_CONUS=Cesium.Rectangle.fromDegrees(-127,20,-64,52));}
function _gStRect(){var s=_stationById(_radarStation),la=s?s[2]:(_radarLat||39),lo=s?s[3]:(_radarLon||-98);return Cesium.Rectangle.fromDegrees(lo-5.5,la-4.5,lo+5.5,la+4.5);}
function _gTile(url,max,rect,credit){return new Cesium.UrlTemplateImageryProvider({url:url+(url.indexOf('?')<0?'?':'&')+'_='+_cacheBust(),maximumLevel:max,rectangle:rect,credit:credit});}
function _gWms(url,layers,rect,credit,extra){return new Cesium.WebMapServiceImageryProvider({url:url,layers:layers,rectangle:rect,maximumLevel:10,credit:credit,parameters:Object.assign({transparent:true,format:'image/png',version:'1.3.0'},extra||{})});}
function _gStopLoop(){if(_G.radarTimer){clearInterval(_G.radarTimer);_G.radarTimer=null;}if(_G.radarFade){cancelAnimationFrame(_G.radarFade);_G.radarFade=0;}if(_G.radarWait){_G.radarWait();_G.radarWait=null;}}
/* resolve when the globe's tile queue drains (or after ms) */
function _gWhenLoaded(ms,cb){var g=_G.v.scene.globe,done=0,rm,to;
  function fin(){if(done)return;done=1;if(rm)rm();clearTimeout(to);_G.radarWait=null;cb();}
  rm=g.tileLoadProgressEvent.addEventListener(function(n){if(n===0)setTimeout(function(){if(g.tilesLoaded)fin();},50);});
  to=setTimeout(fin,ms);_G.radarWait=function(){done=1;if(rm)rm();clearTimeout(to);};_gRender();}
/* crossfade from the current frame to frame j */
function _gFadeTo(j){var from=_G.radar[_G.radarIdx],to=_G.radar[j],ra=Math.min(1,_gOpts.opacity/100+.15),t0=performance.now(),D=280;
  _G.radarIdx=j;_gFrameInfo();if(!from||!to||from===to||window.GS_LITE){_gApplyOpacity();_gRender();return;}/* Lite: cut, not a 280 ms fade (one redraw per frame instead of ~17) */
  if(_G.radarFade)cancelAnimationFrame(_G.radarFade);
  (function step(){var k=Math.min(1,(performance.now()-t0)/D);from.alpha=ra*(1-k);to.alpha=ra*k;_gRender();
    _G.radarFade=k<1?requestAnimationFrame(step):0;if(k>=1)_gApplyOpacity();})();}
function _gClearRadar(){_gStopLoop();_G.radar.forEach(function(l){_G.v.imageryLayers.remove(l,true);});_G.radar=[];_G.radarIdx=0;_G.radarFrames=[];tslSet('gl-rsl',0);}
/* drag the radar time slider: pause, release any frames still waiting to buffer, jump to the frame */
function radarScrub(v){if(!_G.radar.length)return;if(_gOpts.loop)radarPause();if(_G.radarFade){cancelAnimationFrame(_G.radarFade);_G.radarFade=0;}
  _G.radar.forEach(function(l){l._pre=false;});_G.radarIdx=Math.min(+v,_G.radar.length-1);_gApplyOpacity();_gFrameInfo();_gRender();}
function _gRadar(soft){
  if(!_G.v)return;soft=soft&&_G.radar.length>1&&_gOpts.mode==='radar';if(!soft)_gClearRadar();_G.radarAt=_radarLoadedAt=Date.now();var C=Cesium,seq=_G.radarSeq=(_G.radarSeq||0)+1,key=_gOpts.radar,P=_gRP(key);
  _radarProduct=key;
  _gRadarUI();
  if(_gOpts.mode!=='radar'){_gRadarInfo('');_gTs('');_gRender();return;}
  /* Lite loops are shorter: fewer frame layers to download, keep in memory and draw */
  var LT=!!window.GS_LITE,play=!!P.loop,stTag=_radarScope==='national'?'NATIONAL':(_radarStation||'LOCAL');
  /* sources: list of alternatives; each is a function returning frames [{t,label,p}] or a promise of them */
  function show(frames,src,fallback){
    if(seq!==_G.radarSeq)return;
    if(!frames||!frames.length){if(soft)return;if(fallback)return fallback();_gFail(P.name+' UNAVAILABLE');return;}
    /* a background refresh keeps frames it already has (same key) so the loop doesn't flash or refetch */
    var old={},il=_G.v.imageryLayers,last=frames.length-1;
    if(soft){_gStopLoop();_G.radarFrames.forEach(function(f,i){if(f.k)old[f.k]=_G.radar[i];});_G.radar.forEach(function(l,i){var f=_G.radarFrames[i];if(!f||!f.k||!frames.some(function(n){return n.k===f.k;}))il.remove(l,true);});}
    var srcChanged=_G.radarSrc!==src;_G.radarFrames=frames;_G.radarSrc=src;if(srcChanged)_gRadarUI();
    /* the newest frame loads first; the older frames preload only once it is on screen */
    var keep=-1;_G.radar=frames.map(function(f,i){var o=f.k&&old[f.k],l=o||il.addImageryProvider(f.p);if(o)keep=i;else l._pre=soft||(i!==last);return l;});
    /* on refresh, stay on the newest frame already loaded until the new frames have buffered */
    if(soft&&keep<0)_G.radar[last]._pre=false;
    _G.radarIdx=soft&&keep>=0?keep:last;_gApplyOpacity();_gRaise();_gFrameInfo();
    /* fall through to the next source if the shown layer keeps failing before any tile loads */
    if(fallback&&!soft){var bad=0,ok=0,lp=frames[last].p;
      if(lp.errorEvent)lp.errorEvent.addEventListener(function(){if(ok||seq!==_G.radarSeq)return;if(++bad===6){_gClearRadar();fallback();}});
      setTimeout(function(){ok=1;},9000);}
    if(frames.length>1){
      var startLoop=function(){var dwell=0;_G.radarTimer=setInterval(function(){if(!_gVisible()||!_gOpts.loop||_G.radarSeq!==seq)return;if(_G.radarIdx===last&&dwell++<3)return;dwell=0;_gFadeTo((_G.radarIdx+1)%frames.length);},window.GS_LITE?900:600);};
      var pend=_G.radar.filter(function(l){return l._pre;});
      if(!pend.length)startLoop();
      else _gWhenLoaded(3000,function(){if(seq!==_G.radarSeq)return;pend.forEach(function(l){l._pre=false;});_gApplyOpacity();
        _gRadarInfo('BUFFERING '+frames.length+' FRAMES…');
        _gWhenLoaded(8000,function(){if(seq!==_G.radarSeq)return;_gFrameInfo();startLoop();});});
    }
    _gRender();
  }
  function iemLoop(){var fr=[];for(var m=play?(LT?40:50):0;m>=0;m-=LT?10:5)fr.push({t:Date.now()-m*60000,p:_gTile(IEM_TILE+'nexrad-n0q-900913'+(m?'-m'+(m<10?'0':'')+m+'m':'')+'/{z}/{x}/{y}.png',10,_gConus(),'Radar: NOAA NEXRAD via Iowa Environmental Mesonet')});return fr;}
  function rvJson(url,name,credit,max,fb){
    fetch(url).then(function(r){if(!r.ok)throw 0;return r.json();}).then(function(d){
      var past=((d.radar&&d.radar.past)||[]).slice(play?(LT?-4:-6):-1);if(!past.length)throw 0;
      var host=d.host||(url.indexOf('rainviewer')>0?'https://tilecache.rainviewer.com':url.replace(/\/public\/weather-maps\.json$/,''));
      show(past.map(function(f){return{t:f.time*1000,k:host+f.path,p:new C.UrlTemplateImageryProvider({url:host+f.path+'/256/{z}/{x}/{y}/2/1_1.png',maximumLevel:max,credit:credit})};}),name,fb);
    }).catch(function(){if(seq!==_G.radarSeq||soft)return;if(fb)fb();else _gFail(name+' UNREACHABLE');});
  }
  function rainviewer(){rvJson('https://api.rainviewer.com/public/weather-maps.json','RAINVIEWER','Radar: RainViewer',7,null);}
  function needStation(){
    if(_radarStation)return false;
    _gTs(P.name+' // SELECT A STATION');_gRadarInfo('PICK A NEXRAD STATION: CLICK A ◇ ON THE GLOBE');
    if(!_showStations)toggleRadarStations();else _gRender();
    return true;
  }
  _gRadarInfo('LOADING '+P.name+'…');
  switch(key){
    case 'libre':rvJson('https://api.librewxr.net/public/weather-maps.json','OPEN GOV MOSAIC','Radar: LibreWXR (government open data, CC BY 4.0)',8,rainviewer);break;
    case 'global':rainviewer();break;
    case 'bref_qcd':show(iemLoop(),'IEM NEXRAD',rainviewer);break;
    case 'eccc':(function(){var fr=[],base=Math.floor((Date.now()-6*60000)/360000)*360000;
      for(var k=play?(LT?4:8):0;k>=0;k--){var tt=base-k*360000;fr.push({t:tt,p:_gWms('https://geo.weather.gc.ca/geomet','RADAR_1KM_RRAI',C.Rectangle.fromDegrees(-170,15,-45,85),'Radar: Environment and Climate Change Canada (MSC GeoMet)',Object.assign({styles:'Radar-Rain_14colors'},play?{time:new Date(tt).toISOString().slice(0,19)+'Z'}:null))});}
      show(fr,'ECCC GEOMET');})();break;
    case 'hrrr':
      fetch('https://mesonet.agron.iastate.edu/data/gis/images/4326/hrrr/refd_0060.json').then(function(r){if(!r.ok)throw 0;return r.json();}).then(function(j){var t=Date.parse(j.model_init_utc);return isNaN(t)?null:t;}).catch(function(){return null;}).then(function(init){
        var now=Date.now(),fr=[];
        for(var m=60;m<=1080&&fr.length<(play?(LT?6:12):1);m+=60){var vt=init?init+m*60000:null;if(vt&&vt<now-30*60000)continue;
          fr.push({t:vt||now,label:'+'+(m/60)+'H'+(vt?' — VALID '+new Date(vt).toISOString().slice(11,16)+' UTC':''),p:_gTile(IEM_TILE+'hrrr::REFD-F'+('000'+m).slice(-4)+'-0/{z}/{x}/{y}.png',10,_gConus(),'Forecast: NOAA HRRR via IEM')});}
        show(fr,'HRRR FORECAST'+(init?' (RUN '+new Date(init).toISOString().slice(11,13)+'Z)':''));
      });break;
    case 'cref_qcd':
      show([{t:Date.now(),p:_gWms('https://opengeo.ncep.noaa.gov/geoserver/conus/conus_cref_qcd/ows','conus_cref_qcd',_gConus(),'Radar: NOAA MRMS')}],'NOAA MRMS',function(){show([{t:Date.now(),p:_gTile(IEM_TILE+'nexrad-n0q-900913/{z}/{x}/{y}.png',10,_gConus(),'Radar: NOAA NEXRAD via IEM')}],'IEM NEXRAD');});break;
    case 'ptype':
      show([{t:Date.now(),p:_gWms('https://opengeo.ncep.noaa.gov/geoserver/conus/ows','conus_pcpn_typ',_gConus(),'Precip type: NOAA MRMS')}],'NOAA MRMS');break;
    case 'eet':
      show([{t:Date.now(),p:_gTile(IEM_TILE+'nexrad-eet-900913/{z}/{x}/{y}.png',10,_gConus(),'Echo tops: NOAA NEXRAD via IEM')}],'IEM NEXRAD EET',(_radarStation&&_radarScope==='local')?function(){show([{t:Date.now(),p:_gTile(getRadarTileUrl(_radarStation,'echotops'),10,_gStRect(),'Echo tops: NOAA NEXRAD via IEM')}],'IEM RIDGE '+_radarStation);}:null);break;
    case 'vel_qcd':if(needStation())break;
      show([{t:Date.now(),p:_gTile(getRadarTileUrl(_radarStation,'velocity'),10,_gStRect(),'Velocity: NOAA NEXRAD via IEM')}],'IEM RIDGE '+_radarStation);break;
    case 'srv':if(needStation())break;
      show([{t:Date.now(),p:_gTile(IEM_TILE+'ridge::'+_ridgeSite(_radarStation)+'-N0S-0/{z}/{x}/{y}.png',10,_gStRect(),'Velocity: NOAA NEXRAD via IEM')}],'IEM RIDGE '+_radarStation);break;
    case 'hhc':if(needStation())break;
      var ws=_radarStation.toLowerCase();
      show([{t:Date.now(),p:_gWms('https://opengeo.ncep.noaa.gov/geoserver/'+ws+'/ows',ws+'_bdhc',_gStRect(),'Dual-pol: NWS '+_radarStation)}],'NWS '+_radarStation+' HC');break;
    default:
      if(RADAR_PRODUCTS[key]&&RADAR_PRODUCTS[key].layer)show([{t:Date.now(),p:_gTile(IEM_TILE+RADAR_PRODUCTS[key].layer+'-900913/{z}/{x}/{y}.png',10,_gConus(),'Rainfall: NOAA MRMS via IEM')}],'NOAA MRMS');
      else{_gOpts.radar='libre';_gRadar();}
  }
  if(_gVisible())setSys('* SYS: NOMINAL<br>* SRC: '+P.src+'<br>* STATION: '+(_radarStation||'IDLE'));
  _syncRadarUrl();
}
function _gFail(t){_gRadarInfo('<span style="color:#ff6644">'+t+'</span>');_gTs(t);}
function _gFrameInfo(){
  var f=_G.radarFrames[_G.radarIdx];if(!f)return;var n=_G.radarFrames.length,P=_gRP(_gOpts.radar);
  var ts=f.label||(new Date(f.t).toISOString().slice(11,16)+' UTC'),txt=(n>1?'FRAME '+(_G.radarIdx+1)+'/'+n+' — ':'')+ts;
  _gTs(P.name+' // '+_G.radarSrc+' // '+txt);_gRadarInfo(txt+(n>1&&!_gOpts.loop?' (PAUSED)':''));
  tslSet('gl-rsl',n,_G.radarIdx,(n>1?(_G.radarIdx+1)+'/'+n+' — ':'')+ts,_gOpts.loop);
}
function _gTs(t){var el=document.getElementById('gl-ts');if(el){el.style.display=t?'block':'none';el.textContent=t;}}
function _gRadarInfo(t){var el=document.getElementById('glRadarInfo');if(el)el.innerHTML=t;}
/* floating radar bar: product, play, national/local, stations, legend */
function _gRadarUI(){
  var on=_gOpts.mode==='radar',bar=document.getElementById('gl-radar-bar');if(bar)bar.style.display=on?'flex':'none';
  var P=_gRP(_gOpts.radar),sel=document.getElementById('glRadar');if(sel&&sel.value!==_gOpts.radar)sel.value=_gOpts.radar;
  function st(id,active,dis){var el=document.getElementById(id);if(!el)return;el.classList.toggle('on',!!active);el.disabled=!!dis;}
  st('gl-nat',_radarScope==='national');st('gl-loc',_radarScope==='local',_radarLat===null&&!_radarStation);st('gl-st',_showStations);
  var info=document.getElementById('radar-info');
  if(info){var s=_stationById(_radarStation);info.innerHTML=(_radarStation?'STATION: '+_radarStation+(s?' — '+_esc(s[1]):'')+'<br>':'')+(_radarLat!==null?'LAT: '+_radarLat.toFixed(2)+'° LON: '+_radarLon.toFixed(2)+'°':'NO LOCATION — SET ONE ON NWS GROUND OR PICK A STATION');}
  _gKeyUI();
}
/* COLOR KEY panel (lower left). The KEY button by the overlay switch shows or hides it; it follows the active
   overlay: the radar product's scale in radar mode, the GOES band's scale (legend.js) in GOES mode. */
function globeKey(){_gOpts.key=_gOpts.key===false;_gSave();_gKeyUI();}
function _gKeyUI(){
  var el=document.getElementById('radar-legend'),kb=document.getElementById('gl-key');if(!el)return;
  var keyOn=_gOpts.key!==false,m=_gOpts.mode;
  if(kb){kb.classList.toggle('on',keyOn&&m!=='off');kb.disabled=(m==='off');kb.title=keyOn?'Hide the color key':'Show the color key';}
  if(!keyOn||m==='off'){el.style.display='none';return;}
  var close='<span class="rl-x" title="Hide the key">✕</span>',h;
  if(m==='goes'){
    var gk=window.goesKeyHTML&&goesKeyHTML(_gOpts.goes);
    if(!gk){el.innerHTML='<div class="rl-hd" onclick="globeKey()"><span>COLOR KEY</span>'+close+'</div><div class="rl-note">NO COLOR SCALE FOR THIS BAND</div>';el.style.display='block';return;}
    el.innerHTML='<div class="rl-hd" onclick="globeKey()"><span>COLOR KEY // '+gk.t.toUpperCase()+'</span>'+close+'</div><div class="rl-goes">'+gk.h+'</div>';el.style.display='block';return;
  }
  /* the global mosaics (and the IEM product when it falls back to RainViewer) use the Universal Blue rain/snow scales */
  var lk=(RADAR_PRODUCTS[_gOpts.radar]||G_RADAR[_gOpts.radar]||{}).legend||(_gOpts.radar==='eccc'?'eccc':G_RADAR[_gOpts.radar]?'rvub':'');
  if(_gOpts.radar==='bref_qcd'&&_G.radarSrc==='RAINVIEWER')lk='rvub';
  var L=RADAR_LEGENDS[lk];
  if(!L){el.style.display='none';return;}
  h='<div class="rl-hd" onclick="globeKey()"><span>COLOR KEY // '+L.t+(L.u?' ('+L.u+')':'')+'</span>'+close+'</div>';
  var tk=function(c){return'<div class="rl-ticks'+(c||'')+'">'+L.ticks.map(function(t){return'<span style="left:'+Math.min(Math.max(t[0],4),96)+'%">'+t[1]+'</span>';}).join('')+'</div>';};
  if(L.img)h+='<img src="'+L.img+'" alt="'+L.t+' legend" onerror="this.outerHTML=\'<div class=rl-note>LEGEND IMAGE UNAVAILABLE OFFLINE</div>\'">';
  else if(L.bars)h+=L.bars.map(function(b){return'<div class="rl-bl"><b>'+b[0]+'</b><div class="rl-bar" style="background:linear-gradient(to right,'+b[1]+')"></div></div>';}).join('')+tk(' rl-pad');
  else if(L.cats)h+='<div class="rl-cats">'+L.cats.map(function(c){return'<span title="'+c[2]+'"><i style="background:'+c[0]+'"></i>'+c[2]+'</span>';}).join('')+'</div>';
  else{h+='<div class="rl-bar" style="background:linear-gradient(to right,'+L.g+')"></div>'+tk();
    if(L.ends)h+='<div class="rl-ends"><span>'+L.ends[0]+'</span><span>'+L.ends[1]+'</span></div>';}
  if(L.types)h+='<div class="rl-types">'+L.types.map(function(t){return'<div><i style="background:'+t[0]+'"></i><b>'+t[1]+'</b><span>'+t[2]+'</span></div>';}).join('')+'</div>';
  if(L.note)h+='<div class="rl-note">'+L.note+'</div>';
  el.innerHTML=h;el.style.display='block';
}
/* Radar-tab API, kept so the NWS tab and saved links keep working */
function setRadarProduct(k){_gOpts.radar=k;_gSave();_gRadar();}
function radarToggle(){if(!_gRP(_gOpts.radar).loop)return;_gOpts.loop=!_gOpts.loop;_gSave();
  if(_gOpts.loop&&_G.radarFrames.length<2)_gRadar();else{_gRadarUI();_gFrameInfo();}}
function radarPlay(){if(!_gOpts.loop)radarToggle();}
function radarPause(){if(_gOpts.loop)radarToggle();}
function setRadarScope(sc){_radarScope=sc;_gRadarUI();if(!_G.v)return;
  if(sc==='national')_G.v.camera.flyTo({destination:Cesium.Rectangle.fromDegrees(-126,22,-66,51),duration:1.5});
  else if(_radarLat!==null)_gFlyTo(_radarLat,_radarLon,650000);
  if(_gOpts.radar==='eet')_gRadar();}
function updateRadarLocation(lat,lon,stationId){
  _radarLat=lat;_radarLon=lon;_radarStation=stationId||_radarStation;_radarScope='local';
  if(_G.v){_gRenderStations();if(RADAR_PRODUCTS[_gOpts.radar]&&RADAR_PRODUCTS[_gOpts.radar].station)_gRadar();else _gRadarUI();}
  _syncRadarUrl();
}
function handleStationSelect(id,name,lat,lon){
  _radarStation=id;_radarLat=lat;_radarLon=lon;_radarScope='local';
  _gRenderStations();_gRadar();_gFlyTo(lat,lon,650000);
}
/* NEXRAD stations as diamonds on the globe */
function _gDiamond(active){var c=document.createElement('canvas'),n=active?22:16;c.width=c.height=n;var x=c.getContext('2d');x.translate(n/2,n/2);x.rotate(Math.PI/4);var h=n*.33;
  x.fillStyle=active?'#ffb400':'rgba(255,180,0,.25)';x.strokeStyle='#ffb400';x.lineWidth=active?2:1;x.fillRect(-h,-h,2*h,2*h);x.strokeRect(-h,-h,2*h,2*h);return c;}
function toggleRadarStations(){_showStations=!_showStations;_gRenderStations();_gRadarUI();}
function _gRenderStations(){
  if(!_G.v)return;var C=Cesium;
  if(!_G.stations){_G.stations=new C.CustomDataSource('nexrad');_G.v.dataSources.add(_G.stations);_G.dIcon=[_gDiamond(false),_gDiamond(true)];}
  var ds=_G.stations;ds.show=_showStations;
  if(_showStations&&(ds._for!==_radarStation||ds._n!==_nexradStations.length)){
    ds.entities.removeAll();ds._for=_radarStation;ds._n=_nexradStations.length;
    _nexradStations.forEach(function(s){var act=s[0]===_radarStation;
      var e=ds.entities.add({position:C.Cartesian3.fromDegrees(s[3],s[2]),billboard:{image:_G.dIcon[act?1:0],heightReference:C.HeightReference.CLAMP_TO_GROUND,disableDepthTestDistance:5e5,scaleByDistance:new C.NearFarScalar(5e5,1.2,1.5e7,.6)},
        label:{text:s[0],font:'10px "JetBrains Mono", monospace',fillColor:C.Color.fromCssColorString('#ffb400'),outlineColor:C.Color.BLACK,outlineWidth:3,style:C.LabelStyle.FILL_AND_OUTLINE,
          pixelOffset:new C.Cartesian2(0,-14),heightReference:C.HeightReference.CLAMP_TO_GROUND,disableDepthTestDistance:5e5,distanceDisplayCondition:new C.DistanceDisplayCondition(0,act?2e7:3.5e6)}});
      e._station=s;});
  }
  _gRender();
}

/* ── GOES imagery: ABI full disk reprojected to lat/lon ─────
   Fixed-grid → geodetic per the GOES-R PUG (vol. 4, 4.2.8). STAR full-disk JPGs span ±0.151872 rad scan angle. */
var _ABI={H:42164160,req:6378137,rpol:6356752.31414,e2:0.0066943800699785,XM:0.151872};
function _gPieces(lon0){var a=lon0-81,b=lon0+81,out=[];if(a<-180){out.push([a+360,180]);a=-180;}if(b>180){out.push([-180,b-360]);b=180;}out.unshift([a,b]);return out;}
/* lookup table: output pixel → source pixel index (or -1) + alpha. Pure, so it also runs inside the worker. */
function _gLutCore(lon0,W,piece,res,cut,cache){
  var key=[lon0,W,piece[0],piece[1],res,cut].join('|');if(cache[key])return cache[key];
  var A=_ABI,ow=Math.round((piece[1]-piece[0])/res),oh=Math.round(162/res),idx=new Int32Array(ow*oh),al=new Uint8Array(ow*oh),l0=lon0*Math.PI/180,k=0,rr=(A.rpol*A.rpol)/(A.req*A.req);
  for(var j=0;j<oh;j++){var lat=(81-(j+.5)*res)*Math.PI/180,pc=Math.atan(rr*Math.tan(lat)),cp=Math.cos(pc),rc=A.rpol/Math.sqrt(1-A.e2*cp*cp);
    for(var i=0;i<ow;i++,k++){
      var lonD=piece[0]+(i+.5)*res;if((cut>0&&lonD<-106.2)||(cut<0&&lonD>=-106.2&&lonD<0)){idx[k]=-1;continue;}
      var dl=(lonD*Math.PI/180)-l0,vis=Math.cos(lat)*Math.cos(dl);if(vis<.16){idx[k]=-1;continue;}
      var sx=A.H-rc*cp*Math.cos(dl),sy=-rc*cp*Math.sin(dl),sz=rc*Math.sin(pc);
      if(A.H*(A.H-sx)<sy*sy+sz*sz/rr){idx[k]=-1;continue;}
      var x=Math.asin(-sy/Math.sqrt(sx*sx+sy*sy+sz*sz)),y=Math.atan(sz/sx),u=Math.floor((x+A.XM)/(2*A.XM)*W),v=Math.floor((A.XM-y)/(2*A.XM)*W);
      if(u<0||v<0||u>=W||v>=W){idx[k]=-1;continue;}
      idx[k]=v*W+u;al[k]=vis>.3?255:Math.round((vis-.16)/.14*255);
    }}
  return(cache[key]={idx:idx,al:al,w:ow,h:oh});
}
function _gFillCore(src,L,d){for(var k=0,n=L.w*L.h;k<n;k++){var s=L.idx[k];if(s<0)continue;s<<=2;var q=k<<2;d[q]=src[s];d[q+1]=src[s+1];d[q+2]=src[s+2];d[q+3]=L.al[k];}}
function _gRes(W){return W>=5000?.06:.1;}
/* Reprojection worker: keeps the 5424² decode, per-pixel remap and PNG encode off the UI thread. */
var _gW=null,_gWseq=0,_gWcb={};
function _gWorker(){
  if(_gW!==null)return _gW;_gW=false;
  try{
    if(typeof OffscreenCanvas==='undefined'||typeof createImageBitmap==='undefined')return _gW;
    var code='var _ABI='+JSON.stringify(_ABI)+';'+_gPieces+_gLutCore+_gFillCore+_gRes+'var cache={};onmessage=async function(e){var m=e.data;try{var W=m.bmp.width,c=new OffscreenCanvas(W,W),x=c.getContext("2d",{willReadFrequently:true});x.drawImage(m.bmp,0,0);m.bmp.close();var src=x.getImageData(0,0,W,W).data,out=[],ps=_gPieces(m.lon0);for(var i=0;i<ps.length;i++){var L=_gLutCore(m.lon0,W,ps[i],_gRes(W),m.cut,cache),o=new OffscreenCanvas(L.w,L.h),ox=o.getContext("2d"),id=ox.createImageData(L.w,L.h);_gFillCore(src,L,id.data);ox.putImageData(id,0,0);out.push({blob:await o.convertToBlob({type:"image/png"}),w:L.w,h:L.h,pc:ps[i]});}postMessage({id:m.id,out:out});}catch(err){postMessage({id:m.id,err:String(err)});}};';
    var w=new Worker(URL.createObjectURL(new Blob([code],{type:'text/javascript'})));
    w.onmessage=function(e){var cb=_gWcb[e.data.id];delete _gWcb[e.data.id];if(cb)cb(e.data);};
    w.onerror=function(){_gW=false;Object.keys(_gWcb).forEach(function(k){_gWcb[k]({err:'worker'});delete _gWcb[k];});};
    _gW=w;
  }catch(e){_gW=false;}
  return _gW;
}
function _gPiece(blob,w,h,pc){return{url:URL.createObjectURL(blob),w:w,h:h,rect:Cesium.Rectangle.fromDegrees(pc[0],-81,pc[1],81)};}
/* returns a promise of [{url,w,h,rect}] blob images for one FD image */
function _gReproject(img,lon0,cut){
  var w=_gWorker();
  if(w)return createImageBitmap(img).then(function(bmp){return new Promise(function(ok){var id=++_gWseq;_gWcb[id]=ok;w.postMessage({id:id,bmp:bmp,lon0:lon0,cut:cut},[bmp]);});})
    .then(function(r){if(r.err)return _gReprojectMain(img,lon0,cut);return r.out.map(function(p){return _gPiece(p.blob,p.w,p.h,p.pc);});});
  return _gReprojectMain(img,lon0,cut);
}
function _gReprojectMain(img,lon0,cut){
  var W=img.naturalWidth,cv=document.createElement('canvas');cv.width=cv.height=W;var cx=cv.getContext('2d',{willReadFrequently:true});cx.drawImage(img,0,0);
  var src;try{src=cx.getImageData(0,0,W,W).data;}catch(e){return Promise.reject(e);}
  return Promise.all(_gPieces(lon0).map(function(pc){
    var L=_gLutCore(lon0,W,pc,_gRes(W),cut,_G.lut),o=document.createElement('canvas');o.width=L.w;o.height=L.h;var ox=o.getContext('2d'),id=ox.createImageData(L.w,L.h);
    _gFillCore(src,L,id.data);ox.putImageData(id,0,0);
    return new Promise(function(ok){o.toBlob(function(b){ok(_gPiece(b,L.w,L.h,pc));},'image/png');});
  }));
}
function _gAddImgs(pieces,credit){return pieces.map(function(p){_G.goesUrls.push(p.url);return _G.v.imageryLayers.addImageryProvider(new Cesium.SingleTileImageryProvider({url:p.url,rectangle:p.rect,tileWidth:p.w,tileHeight:p.h,credit:credit}));});}
function _gLoadImg(url){return new Promise(function(ok,no){var im=new Image();im.crossOrigin='anonymous';im.onload=function(){ok(im);};im.onerror=no;im.src=url;});}
function _gClearGoes(){_G.goes.forEach(function(l){_G.v.imageryLayers.remove(l,true);});_G.goes=[];}
function _gGoes(){
  if(!_G.v)return;var seq=_G.goesSeq=(_G.goesSeq||0)+1;_G.goesAt=Date.now();
  if(_gOpts.mode!=='goes'){_G.goesSeq++;_gClearGoes();_gGoesInfo('');_gRender();return;}
  var band=_gOpts.goes,size=(IS_TOUCH||window.GS_LITE)?'1808x1808':'5424x5424',/* Lite: 1808 px source, 1/5 the download and ~1/3 the texture memory */sats=_gOpts.goesSat==='both'?['GOES18','GOES19']:[_gOpts.goesSat],bust=Math.floor(Date.now()/600000);
  _gGoesInfo('LOADING GOES '+band+'…');
  Promise.all(sats.map(function(s){
    return _gLoadImg('https://cdn.star.nesdis.noaa.gov/'+s+'/ABI/FD/'+band+'/'+size+'.jpg?_='+bust).then(function(im){
      if(seq!==_G.goesSeq)return[];var cut=sats.length>1?(s==='GOES19'?1:-1):0;
      return _gReproject(im,s==='GOES19'?-75.2:-137.2,cut);
    });
  })).then(function(all){
    if(seq!==_G.goesSeq)return;var old=_G.goes,oldUrls=_G.goesUrls;_G.goesUrls=[];
    _G.goes=[];all.forEach(function(p){_G.goes=_G.goes.concat(_gAddImgs(p,'GOES ABI: NOAA/NESDIS STAR'));});
    old.forEach(function(l){_G.v.imageryLayers.remove(l,true);});setTimeout(function(){oldUrls.forEach(URL.revokeObjectURL);},5000);
    _gApplyOpacity();_gRaise();_gRender();
    _gGoesInfo((sats.length>1?'GOES-18 + GOES-19':sats[0].replace('GOES','GOES-'))+' // '+(band.length<3?'CH'+band:band)+' // LATEST FULL DISK');
  }).catch(function(){if(seq===_G.goesSeq)_gGoesInfo('<span style="color:#ff6644">GOES IMAGE UNAVAILABLE</span>');});
}
function _gGoesInfo(t){var el=document.getElementById('glGoesInfo');if(el)el.innerHTML=t;}

/* ── animated loop from the Live Imagery tab (Full Disk only) ── */
function _gClearDisk(){_G.disk.forEach(function(l){_G.v.imageryLayers.remove(l,true);});_G.disk=[];_G.diskIdx=-1;(_G.diskUrls||[]).forEach(URL.revokeObjectURL);_G.diskUrls=[];}
function toggleDiskTexture(){
  if(!_G.v)return;var btn=document.getElementById('diskTexBtn');
  if(_diskOverlayActive){_diskOverlayActive=false;_gClearDisk();_imgTsl();_gApplyOpacity();_gRender();if(btn){btn.textContent='◉ OVERLAY LIVE LOOP';btn.style.color='';}return;}
  if(lastPath!=='FD'||(!animFrames.length&&!currentImgUrl))return;
  _diskOverlayActive=true;if(btn){btn.textContent='◉ LIVE LOOP: LOADING…';btn.style.color='var(--y)';}
  refreshDiskTextures(true);
}
function refreshDiskTextures(force){
  if(!_diskOverlayActive||!_G.v)return;
  if(lastPath!=='FD'){toggleDiskTexture();return;}
  var lon0=lastSat==='GOES19'?-75.2:-137.2,seq=_G.diskSeq=(_G.diskSeq||0)+1;
  var imgs=animFrames.length?Promise.resolve(animFrames.map(function(f){return f.img;})):_gLoadImg(currentImgUrl).then(function(i){return[i];});
  imgs.then(function(list){
    /* sequential so the UI stays responsive */
    var out=[],p=Promise.resolve();
    list.forEach(function(im){p=p.then(function(){if(seq!==_G.diskSeq)return;return new Promise(function(r){setTimeout(r,0);}).then(function(){return _gReproject(im,lon0,0);}).then(function(x){out.push(x);});});});
    return p.then(function(){return out;});
  }).then(function(frames){
    if(seq!==_G.diskSeq||!_diskOverlayActive)return;_gClearDisk();_G.diskUrls=[];
    frames.forEach(function(pcs){pcs.forEach(function(p){_G.diskUrls.push(p.url);});});
    _G.diskFrames=frames.map(function(pcs){return pcs.map(function(p){return _G.v.imageryLayers.addImageryProvider(new Cesium.SingleTileImageryProvider({url:p.url,rectangle:p.rect,tileWidth:p.w,tileHeight:p.h,credit:'GOES ABI: NOAA/NESDIS STAR'}));});});
    _G.disk=[].concat.apply([],_G.diskFrames);_G.diskIdx=-1;_gDiskTick(true);_gRaise();_imgTsl();
    var btn=document.getElementById('diskTexBtn');if(btn)btn.textContent='◉ LIVE LOOP: ON';
  }).catch(function(){var btn=document.getElementById('diskTexBtn');if(btn)btn.textContent='◉ LIVE LOOP FAILED — RETRY';_diskOverlayActive=false;});
}
function _gDiskTick(force){
  if(!_diskOverlayActive||!_G.diskFrames||!_G.diskFrames.length)return;
  var f=animIdx%_G.diskFrames.length;if(f===_G.diskFrameShown&&!force)return;_G.diskFrameShown=f;
  var a=_gOpts.opacity/100;_G.goes.forEach(function(l){l.show=false;});
  _G.diskFrames.forEach(function(pcs,i){pcs.forEach(function(l){l.alpha=a;l.show=(i===f);});});_gRender();
}
function updateDiskTexBtn(){var btn=document.getElementById('diskTexBtn'),st=document.getElementById('diskTexStatus');if(!btn)return;var ok=lastPath==='FD'&&(animFrames.length>0||!!currentImgUrl);btn.style.display=ok?'block':'none';if(st)st.style.display=ok?'none':'block';}
