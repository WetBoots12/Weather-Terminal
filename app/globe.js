/* 3D GLOBE — CesiumJS (vendored in app/vendor/cesium, loaded on first open of the 3D tab).
   Base imagery, labels and terrain: Esri. Radar: IEM NEXRAD composite or RainViewer.
   GOES: NOAA STAR full-disk JPGs reprojected from the ABI fixed grid onto lat/lon in the browser. */
var globeReady=false,_diskOverlayActive=false,_globeKick=function(){globeResize();};
var _G={v:null,layers:{},radar:[],radarIdx:0,radarTimer:null,goes:[],goesUrls:[],disk:[],diskIdx:-1,ents:{},pending:null,pin:null,cone:[],lut:{},refresh:null};
var _GEO_ALT=0.75*6371000,_LEO_ALT=0.2*6371000; /* stylized altitudes so orbits fit on screen, as before */
var _gOpts={labels:true,terrain:true,grid:true,sats:true,light:false,radar:'iem',loop:false,goes:'off',goesSat:'both',opacity:75};
try{var _gs=JSON.parse(localStorage.getItem('gs_globe')||'null');if(_gs)for(var _k in _gs)if(_k in _gOpts)_gOpts[_k]=_gs[_k];}catch(e){}
function _gSave(){try{localStorage.setItem('gs_globe',JSON.stringify(_gOpts));}catch(e){}}
function _gStatus(t){var el=document.getElementById('glStatus');if(el)el.innerHTML=t;}
function _gRender(){if(_G.v)_G.v.scene.requestRender();}
function globeResize(){if(_G.v){_G.v.resize();_gRender();}}

function initGlobe(){
  if(globeReady)return;globeReady=true;_gSyncUI();
  if(window.Cesium){_gBuild();return;}
  _gStatus('LOADING 3D ENGINE…');
  window.CESIUM_BASE_URL='vendor/cesium/';
  var css=document.createElement('link');css.rel='stylesheet';css.href='vendor/cesium/Widgets/widgets.css';document.head.appendChild(css);
  var s=document.createElement('script');s.src='vendor/cesium/Cesium.js';
  s.onload=_gBuild;s.onerror=function(){globeReady=false;_gStatus('<span style="color:#ff6644">3D ENGINE FAILED TO LOAD</span>');};
  document.head.appendChild(s);
}

function _gEsri(path,max,credit){return new Cesium.UrlTemplateImageryProvider({url:'https://server.arcgisonline.com/ArcGIS/rest/services/'+path+'/MapServer/tile/{z}/{y}/{x}',maximumLevel:max,credit:credit});}

function _gBuild(){
  var C=Cesium;
  var v=new C.Viewer('globe-cesium',{
    baseLayer:new C.ImageryLayer(_gEsri('World_Imagery',18,'Imagery: Esri, Maxar, Earthstar Geographics')),
    animation:false,timeline:false,baseLayerPicker:false,geocoder:false,homeButton:false,sceneModePicker:false,
    navigationHelpButton:false,fullscreenButton:false,infoBox:false,selectionIndicator:false,
    requestRenderMode:true,maximumRenderTimeChange:30,shouldAnimate:true
  });
  _G.v=v;var sc=v.scene,gl=sc.globe;
  gl.maximumScreenSpaceError=IS_TOUCH?2:1.5;gl.tileCacheSize=IS_TOUCH?100:400;
  gl.showGroundAtmosphere=true;gl.baseColor=C.Color.fromCssColorString('#0d2d4a');
  sc.backgroundColor=C.Color.BLACK;sc.fog.enabled=true;
  var ctl=sc.screenSpaceCameraController;ctl.minimumZoomDistance=120;ctl.maximumZoomDistance=8e7;
  v.clock.clockStep=C.ClockStep.SYSTEM_CLOCK;v.clock.shouldAnimate=true;
  /* labels + roads (Google Earth style hybrid) */
  _G.layers.places=v.imageryLayers.addImageryProvider(_gEsri('Reference/World_Boundaries_and_Places',18,'Labels: Esri'));
  _G.layers.roads=v.imageryLayers.addImageryProvider(_gEsri('Reference/World_Transportation',18,'Roads: Esri'));
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
  function pickAt(pos,client){
    var p=sc.pick(pos),tip=document.getElementById('sat-tip');
    var s=p&&p.id&&p.id._sat;
    if(!s){tip.style.display='none';_gHideCone();return;}
    tip.style.display='block';tip.style.left=(pos.x+16)+'px';tip.style.top=(pos.y+16)+'px';
    tip.innerHTML='<b>'+s.title+'</b><br>'+(s.agency?'AGENCY: '+s.agency+'<br>':'')+'ORBIT: '+s.orbit+(s.orbit==='GEO'?'<br>LON: '+Math.abs(s.lon).toFixed(1)+'°'+(s.lon<0?'W':'E')+'<br>LAT: 0.0° N':'')+'<br>ALT: '+(s.orbit==='GEO'?'35,786':'~830')+' KM'+(s.primary?'<br>MODE: 6 (10-MIN FLEX)':'');
    if(s.primary)_gShowCone(s);else _gHideCone();
  }
  v.screenSpaceEventHandler.setInputAction(function(e){var n=Date.now();if(n-lastPick<60)return;lastPick=n;pickAt(e.endPosition);},C.ScreenSpaceEventType.MOUSE_MOVE);
  v.screenSpaceEventHandler.setInputAction(function(e){pickAt(e.position);if(IS_TOUCH)setTimeout(function(){document.getElementById('sat-tip').style.display='none';},3000);},C.ScreenSpaceEventType.LEFT_CLICK);
  _gBuildGrid();_gBuildSats();
  globeHome(0);
  _gApplyAll();
  if(_pinLat!==null)placeNWSPin(_pinLat,_pinLon);
  if(_G.pending){var pp=_G.pending;_G.pending=null;_gFlyTo(pp[0],pp[1],pp[2]);}
  _G.refresh=setInterval(function(){
    if(document.hidden||!_gVisible())return;
    if(_gOpts.radar!=='off'&&Date.now()-(_G.radarAt||0)>300000)_gRadar();
    if(_gOpts.goes!=='off'&&Date.now()-(_G.goesAt||0)>600000)_gGoes();
  },30000);
  setInterval(function(){if(!_gVisible()||document.hidden)return;_gUpdateLEO();_gSunInfo();_gRender();},1000);
  setInterval(function(){if(_diskOverlayActive&&_gVisible())_gDiskTick();},120);
  _gUpdateLEO();_gSunInfo();_gStatus('');
}
function _gVisible(){var w=document.getElementById('globe-wrap');return !!(w&&w.offsetParent!==null);}

/* ── options UI ─────────────────────────────────────────── */
function _gSyncUI(){
  var m={glLabels:'labels',glTerrain:'terrain',glGrid:'grid',glSats:'sats',glLight:'light',glRadarLoop:'loop'};
  for(var id in m){var el=document.getElementById(id);if(el)el.checked=!!_gOpts[m[id]];}
  var r=document.getElementById('glRadar');if(r)r.value=_gOpts.radar;
  var g=document.getElementById('glGoes');if(g)g.value=_gOpts.goes;
  var gs=document.getElementById('glGoesSat');if(gs)gs.value=_gOpts.goesSat;
  var o=document.getElementById('glOpacity');if(o)o.value=_gOpts.opacity;
}
function globeOpt(k,val){
  _gOpts[k]=(k==='opacity')?parseInt(val):val;_gSave();if(!_G.v)return;
  if(k==='labels'){_G.layers.places.show=_G.layers.roads.show=!!val;}
  else if(k==='terrain')_gApplyTerrain();
  else if(k==='grid')_G.grid.show=!!val;
  else if(k==='sats')_G.sats.show=!!val;
  else if(k==='light'){_G.v.scene.globe.enableLighting=!!val;_G.v.scene.globe.dynamicAtmosphereLighting=!!val;}
  else if(k==='radar'||k==='loop')_gRadar();
  else if(k==='goes'||k==='goesSat')_gGoes();
  else if(k==='opacity')_gApplyOpacity();
  _gRender();
}
function _gApplyAll(){var L=_G.layers;L.places.show=L.roads.show=_gOpts.labels;_G.grid.show=_gOpts.grid;_G.sats.show=_gOpts.sats;
  _G.v.scene.globe.enableLighting=_gOpts.light;_G.v.scene.globe.dynamicAtmosphereLighting=_gOpts.light;_gRadar();_gGoes();}
function _gApplyTerrain(){if(!_G.v)return;_G.v.terrainProvider=(_gOpts.terrain&&_G.terrain)?_G.terrain:new Cesium.EllipsoidTerrainProvider();}
function _gApplyOpacity(){
  var a=_gOpts.opacity/100;
  _G.goes.forEach(function(l){l.alpha=_diskOverlayActive?0:a;});
  _G.disk.forEach(function(l,i){l.alpha=(i===_G.diskIdx)?a:0;});
  _G.radar.forEach(function(l,i){l.alpha=(i===_G.radarIdx)?Math.min(1,a+.15):0;});
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
  var list=[{title:'GOES-19 (EAST)',label:'G19-EAST 75.2°W',lon:-75.2,color:'#ffb400',orbit:'GEO',primary:true,agency:'NOAA'},
            {title:'GOES-18 (WEST)',label:'G18-WEST 137.2°W',lon:-137.2,color:'#00cfff',orbit:'GEO',primary:true,agency:'NOAA'}];
  (window._geoSatDefs||[]).forEach(function(d){list.push({title:d.name,label:d.name,lon:d.lon,color:_gHex(d.color),orbit:'GEO',agency:d.agency});});
  (window._leoSatDefs||[]).forEach(function(d){var t=_hardcodedTLEs[d.name],sr=null;if(t&&window.satellite){try{sr=satellite.twoline2satrec(t[0],t[1]);}catch(e){}}
    if(sr)list.push({title:d.name,label:d.name,color:_gHex(d.color),orbit:'LEO',agency:d.agency,satrec:sr,cat:d.cat});});
  _G.leo=[];
  list.forEach(function(s){
    var col=C.Color.fromCssColorString(s.color),pos=s.orbit==='GEO'?C.Cartesian3.fromDegrees(s.lon,0,_GEO_ALT):C.Cartesian3.ZERO;
    var e=ds.entities.add({position:pos,
      billboard:{image:_gSatIcon(s.color),scale:s.primary?.9:.7,scaleByDistance:new C.NearFarScalar(2e6,1.3,6e7,.55)},
      label:{text:s.label,font:'10px "JetBrains Mono", monospace',fillColor:col,outlineColor:C.Color.BLACK,outlineWidth:3,style:C.LabelStyle.FILL_AND_OUTLINE,
        horizontalOrigin:C.HorizontalOrigin.LEFT,verticalOrigin:C.VerticalOrigin.CENTER,pixelOffset:new C.Cartesian2(18,0),scaleByDistance:new C.NearFarScalar(2e6,1.2,6e7,.8)}});
    e._sat=s;s.ent=e;
    if(s.orbit==='GEO')ds.entities.add({polyline:{positions:[pos,C.Cartesian3.fromDegrees(s.lon,0,0)],width:1,arcType:C.ArcType.NONE,material:col.withAlpha(.3)}});
    else _G.leo.push(s);
  });
  _gFetchTLEs();
}
function _gUpdateLEO(){
  if(!_G.leo||!window.satellite)return;var now=new Date(),gm=satellite.gstime(now);
  _G.leo.forEach(function(s){try{var pv=satellite.propagate(s.satrec,now);if(!pv||!pv.position)return;var g=satellite.eciToGeodetic(pv.position,gm);
    s.ent.position=Cesium.Cartesian3.fromRadians(g.longitude,g.latitude,_LEO_ALT);}catch(e){}});
}
function _gFetchTLEs(){
  (_G.leo||[]).forEach(function(s){
    fetch('https://celestrak.org/NORAD/elements/gp.php?CATNR='+s.cat+'&FORMAT=TLE').then(function(r){return r.text();}).then(function(t){
      var l=t.trim().split('\n').map(function(x){return x.trim();});
      if(l.length>=3){try{var sr=satellite.twoline2satrec(l[1],l[2]);if(sr)s.satrec=sr;}catch(e){}}
    }).catch(function(){});
  });
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

/* ── live radar ─────────────────────────────────────────── */
function _gClearRadar(){if(_G.radarTimer){clearInterval(_G.radarTimer);_G.radarTimer=null;}_G.radar.forEach(function(l){_G.v.imageryLayers.remove(l,true);});_G.radar=[];_G.radarIdx=0;}
function _gRadar(){
  if(!_G.v)return;_gClearRadar();_G.radarAt=Date.now();var C=Cesium,seq=_G.radarSeq=(_G.radarSeq||0)+1;
  if(_gOpts.radar==='off'){_gRadarInfo('');_gRender();return;}
  function add(frames,src){
    if(seq!==_G.radarSeq)return;
    _G.radar=frames.map(function(f){var l=_G.v.imageryLayers.addImageryProvider(f.p);l.alpha=0;return l;});
    _G.radarTimes=frames.map(function(f){return f.t;});_G.radarIdx=frames.length-1;_gApplyOpacity();_gRaise();
    var info=function(){_gRadarInfo(src+' // '+new Date(_G.radarTimes[_G.radarIdx]).toISOString().slice(11,16)+' UTC');};info();
    if(frames.length>1){var dwell=0;_G.radarTimer=setInterval(function(){if(!_gVisible())return;if(_G.radarIdx===frames.length-1&&dwell++<3)return;dwell=0;_G.radarIdx=(_G.radarIdx+1)%frames.length;_gApplyOpacity();info();_gRender();},500);}
    _gRender();
  }
  var bust=Math.floor(Date.now()/300000);
  if(_gOpts.radar==='iem'){
    var rect=C.Rectangle.fromDegrees(-127,21,-64,51),fr=[];
    for(var m=_gOpts.loop?50:0;m>=0;m-=5)fr.push({t:Date.now()-m*60000,p:new C.UrlTemplateImageryProvider({url:IEM_TILE+'nexrad-n0q-900913'+(m?'-m'+(m<10?'0':'')+m+'m':'')+'/{z}/{x}/{y}.png?_='+bust,maximumLevel:10,rectangle:rect,credit:'Radar: NOAA NEXRAD via Iowa Environmental Mesonet'})});
    add(fr,'US NEXRAD');
  }else{
    fetch('https://api.rainviewer.com/public/weather-maps.json').then(function(r){return r.json();}).then(function(d){
      var host=d.host||'https://tilecache.rainviewer.com',past=((d.radar&&d.radar.past)||[]).slice(_gOpts.loop?-6:-1);
      add(past.map(function(f){return{t:f.time*1000,p:new C.UrlTemplateImageryProvider({url:host+f.path+'/256/{z}/{x}/{y}/2/1_1.png',maximumLevel:7,credit:'Radar: RainViewer'})};}),'GLOBAL RADAR');
    }).catch(function(){if(seq===_G.radarSeq)_gRadarInfo('<span style="color:#ff6644">RAINVIEWER UNREACHABLE</span>');});
  }
}
function _gRadarInfo(t){var el=document.getElementById('glRadarInfo');if(el)el.innerHTML=t;}

/* ── GOES imagery: ABI full disk reprojected to lat/lon ─────
   Fixed-grid → geodetic per the GOES-R PUG (vol. 4, 4.2.8). STAR full-disk JPGs span ±0.151872 rad scan angle. */
var _ABI={H:42164160,req:6378137,rpol:6356752.31414,e2:0.0066943800699785,XM:0.151872};
function _gPieces(lon0){var a=lon0-81,b=lon0+81,out=[];if(a<-180){out.push([a+360,180]);a=-180;}if(b>180){out.push([-180,b-360]);b=180;}out.unshift([a,b]);return out;}
/* lookup table: output pixel → source pixel index (or -1) + alpha */
function _gLut(lon0,W,piece,res,cut){
  var key=[lon0,W,piece[0],piece[1],res,cut].join('|');if(_G.lut[key])return _G.lut[key];
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
  return(_G.lut[key]={idx:idx,al:al,w:ow,h:oh});
}
/* returns a promise of [{url,rect}] blob images for one FD image */
function _gReproject(img,lon0,cut){
  var W=img.naturalWidth,cv=document.createElement('canvas');cv.width=cv.height=W;var cx=cv.getContext('2d',{willReadFrequently:true});cx.drawImage(img,0,0);
  var src;try{src=cx.getImageData(0,0,W,W).data;}catch(e){return Promise.reject(e);}
  var res=W>=5000?.06:.1;
  return Promise.all(_gPieces(lon0).map(function(pc){
    var L=_gLut(lon0,W,pc,res,cut),o=document.createElement('canvas');o.width=L.w;o.height=L.h;var ox=o.getContext('2d'),id=ox.createImageData(L.w,L.h),d=id.data;
    for(var k=0,n=L.w*L.h;k<n;k++){var s=L.idx[k];if(s<0)continue;s<<=2;var q=k<<2;d[q]=src[s];d[q+1]=src[s+1];d[q+2]=src[s+2];d[q+3]=L.al[k];}
    ox.putImageData(id,0,0);
    return new Promise(function(res2){o.toBlob(function(b){res2({url:URL.createObjectURL(b),w:L.w,h:L.h,rect:Cesium.Rectangle.fromDegrees(pc[0],-81,pc[1],81)});},'image/png');});
  }));
}
function _gAddImgs(pieces,credit){return pieces.map(function(p){_G.goesUrls.push(p.url);return _G.v.imageryLayers.addImageryProvider(new Cesium.SingleTileImageryProvider({url:p.url,rectangle:p.rect,tileWidth:p.w,tileHeight:p.h,credit:credit}));});}
function _gLoadImg(url){return new Promise(function(ok,no){var im=new Image();im.crossOrigin='anonymous';im.onload=function(){ok(im);};im.onerror=no;im.src=url;});}
function _gClearGoes(){_G.goes.forEach(function(l){_G.v.imageryLayers.remove(l,true);});_G.goes=[];}
function _gGoes(){
  if(!_G.v)return;var seq=_G.goesSeq=(_G.goesSeq||0)+1;_G.goesAt=Date.now();
  if(_gOpts.goes==='off'){_gClearGoes();_gGoesInfo('');_gRender();return;}
  var band=_gOpts.goes,size=IS_TOUCH?'1808x1808':'5424x5424',sats=_gOpts.goesSat==='both'?['GOES18','GOES19']:[_gOpts.goesSat],bust=Math.floor(Date.now()/600000);
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
  if(_diskOverlayActive){_diskOverlayActive=false;_gClearDisk();_gApplyOpacity();_gRender();if(btn){btn.textContent='◉ OVERLAY LIVE LOOP';btn.style.color='';}return;}
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
    _G.disk=[].concat.apply([],_G.diskFrames);_G.diskIdx=-1;_gDiskTick(true);_gRaise();
    var btn=document.getElementById('diskTexBtn');if(btn)btn.textContent='◉ LIVE LOOP: ON';
  }).catch(function(){var btn=document.getElementById('diskTexBtn');if(btn)btn.textContent='◉ LIVE LOOP FAILED — RETRY';_diskOverlayActive=false;});
}
function _gDiskTick(force){
  if(!_diskOverlayActive||!_G.diskFrames||!_G.diskFrames.length)return;
  var f=animIdx%_G.diskFrames.length;if(f===_G.diskFrameShown&&!force)return;_G.diskFrameShown=f;
  var a=_gOpts.opacity/100;_G.goes.forEach(function(l){l.alpha=0;});
  _G.diskFrames.forEach(function(pcs,i){pcs.forEach(function(l){l.alpha=i===f?a:0;});});_gRender();
}
function updateDiskTexBtn(){var btn=document.getElementById('diskTexBtn'),st=document.getElementById('diskTexStatus');if(!btn)return;var ok=lastPath==='FD'&&(animFrames.length>0||!!currentImgUrl);btn.style.display=ok?'block':'none';if(st)st.style.display=ok?'none':'block';}
