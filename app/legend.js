/* ═══════════════════════ IMAGERY COLOR KEY ═══════════════════════
   On-screen legend for the selected GOES band / RGB on the Live Imagery tab.
   Continuous scales are sampled pixel-for-pixel from the color bars that
   NOAA/NESDIS STAR publishes next to each product in its GOES Image Viewer
   (star.nesdis.noaa.gov/GOES/images/colorbars/), so they match the imagery.
   Categorical keys use STAR's own numbered keys; GeoColor uses the CIRA
   GeoColor Quick Guide. Also rendered into the field manual band cards. */
(function(){
var SRC_STAR='NOAA/NESDIS STAR GOES Image Viewer',SRC_CIRA='CIRA GeoColor Quick Guide';

/* Continuous scales: g = CSS gradient stops, t = [position %, label] */
var IR1115={u:'°C',cap:'BRIGHTNESS TEMPERATURE',
 g:'#fff 0%,#fdfdfd 7.2%,#787878 9.6%,#1c1c1c 11.4%,#010000 11.9%,#f90000 15.2%,#ff1300 15.7%,#fffe00 19.2%,#06ff00 23%,#00ea0a 23.5%,#000371 26.6%,#000073 27.1%,#00e6f1 31.3%,#0ff 31.8%,#6cdcdb 32%,#ccb9b9 32.2%,#bcbcbc 32.9%,#000 100%',
 t:[[0,'-110'],[20.1,'-59'],[40,'-20'],[59.7,'6'],[79.6,'31'],[100,'57']],
 lo:'COLD / HIGH CLOUD TOPS',hi:'WARM / LOW CLOUD, GROUND'};
var SCALES={
 '07':{u:'°C',cap:'BRIGHTNESS TEMPERATURE',
  g:'#7c7c7c 0%,#191919 11%,#010000 11.4%,#fc0000 14.8%,#ff0500 15%,#fdfe00 18.8%,#05ff00 22.6%,#00f903 22.8%,#000371 26.2%,#000173 26.6%,#00e6f1 30.9%,#03fefe 31.3%,#ccb9b9 31.8%,#bcbcbc 32.4%,#000 100%',
  t:[[0,'-83'],[20.1,'-42'],[40,'-13'],[59.8,'13'],[79.6,'38'],[100,'127']],
  lo:'COLD CLOUD TOPS',hi:'HOT: FIRES = DARK GRAY TO BLACK PIXELS'},
 WV:{u:'°C',cap:'BRIGHTNESS TEMPERATURE',
  g:'#0ff 0%,#438222 10.1%,#fff 31.5%,#000073 50.8%,#ff0 62.9%,#f00 91.9%,#720000 92.2%,#000 92.4%,#000 100%',
  t:[[1.3,'-93'],[21,'-54'],[40.5,'-30'],[60.2,'-18'],[79.6,'-5'],[99.3,'7']],
  lo:'CLOUDS · « MOIST',hi:'DRY »'},
 IR:IR1115,
 '16':{u:'°C',cap:'BRIGHTNESS TEMPERATURE',
  g:'#000 0%,#fefefe 13.4%,#e8e8ff 15.9%,#00f 36%,#704140 50.1%,#89140b 50.3%,#8f1003 50.6%,#c88a1d 56.2%,#ff3 61.7%,#ff0 62.2%,#f00 74.7%,#f10e0e 76.1%,#808080 83.9%,#010101 100%',
  t:[[0,'-128'],[13.4,'-93'],[23.3,'-60'],[36.2,'-30'],[50.2,'0'],[62,'30'],[75.2,'60'],[83.7,'83'],[100,'128']],
  lo:'COLD',hi:'WARM'},
 Sandwich:{u:'°C',cap:'BAND 13 CLOUD-TOP TEMPERATURE',
  g:'#01017a 0%,#00f 12.8%,#0016ff 15.9%,#0ff 38.5%,#0fffe5 40.9%,#f5ff02 63.3%,#fff600 64.9%,#f00 89%,#c80000 94.2%,#850000 100%',
  t:[[0,'-15'],[100,'-93']],
  lo:'',hi:'COLDER CLOUDS »',
  note:'Clouds warmer than -15 °C and clear ground show the plain Band 3 visible image in gray. Daytime only.'},
 EXTENT3:{u:'',cap:'LIGHTNING FLASHES PER 5 MIN (LOG SCALE)',
  g:'#007000 0%,#009b00 8.1%,#03ff00 24.4%,#28ff00 28.6%,#55ff00 32.9%,#83ff00 37.4%,#caff00 44.3%,#ebff00 47.4%,#fffb00 50.3%,#ffd700 53.9%,#ffbf00 56.4%,#ff8800 61.5%,#ff6400 65.3%,#ff4400 68.2%,#ff1f00 72%,#f00 75.6%,#ff0073 81.2%,#ff008f 82.6%,#f0f 88.1%,#ce32ff 90.4%,#bd42ff 91.3%,#758aff 94.6%,#06faff 100%',
  t:[[0,'0.1'],[8.8,'0.2'],[20.5,'0.5'],[29.4,'1'],[58.7,'10'],[88,'100'],[100,'255']],
  lo:'',hi:'',
  note:'Drawn over a GeoColor background. GLM data cover 54°N to 54°S.'}
};
['11','12','13','14','15'].forEach(function(b){SCALES[b]=IR1115;});
['08','09','10'].forEach(function(b){SCALES[b]=SCALES.WV;});

/* Reflectance bands 1-6: STAR shows them in plain grayscale */
var VIS={
 '01':'Bright = cloud, snow, thick smoke/haze. Dark = clear land and water.',
 '02':'Bright = cloud, snow, ice. Dark = clear land and water.',
 '03':'Bright = cloud and healthy vegetation. Dark = water, flooded ground, burn scars.',
 '04':'Bright = high cirrus only. Low cloud and ground stay dark in moist air.',
 '05':'Bright = water-droplet clouds. Dark = ice-topped clouds, snow and water.',
 '06':'Bright = clouds with small particles. Dark = large particles, ice and snow.'
};

/* Categorical keys: [color or [color,color], label] */
var KEYS={
 GEOCOLOR:{src:SRC_CIRA,groups:[
  ['NIGHT',[['#85b4ec','Low-level water clouds, fog (light blue)'],['#9895a0','Mid-level and cirrus clouds (grayish white)'],['#f1c337','City lights, static map (gold)'],['#3b1069','Clear sky land (dark purple)']]],
  ['DAY',[['#ffffff','High / thick clouds (bright white)'],['#c4a57f','Thick smoke (dark gray / tan)'],['#9da2d0','Thinner smoke (bluish gray)'],['#25447f','Ocean surface (shades of blue)'],['#005000','Vegetation / forest (shades of green)'],['#8b7c6a','Dry / desert (shades of brown)']]]]},
 AirMass:{src:SRC_STAR,groups:[[null,[
  ['#b52007','Jet stream, PV anomaly, dry upper air (dark red / orange)'],['#0a0a8c','Cold air mass (dark blue / purple)'],['#548235','Warm air mass (green)'],['#757844','Warm air mass, less moisture (olive / dark orange)'],['#ffffff','High thick cloud (white)'],['#b5744f','Mid-level cloud (tan / salmon)'],['#335a25','Low-level cloud (green, dark blue)'],['#6e008c','Limb effect at disk edge, not cold air (purple / blue)']]]]},
 FireTemperature:{src:SRC_STAR,groups:[[null,[
  ['#db0404','Warm fire'],['#ff9650','Very warm fire'],['#fff07d','Hot fire'],['#ffffff','Very hot fire'],['#780f24','Burn scar'],[['#660066','#ff6699'],'Clear sky: land'],['#000000','Clear sky: water, snow, or night'],['#006699','Water clouds'],['#008080','Ice clouds']]]]},
 Dust:{src:SRC_STAR,groups:[[null,[
  ['#dc389e','Dust plume by day (bright magenta / pink); purple at night below ~3 km'],['#c78be0','Low water cloud (light purple)'],['#c4deff','Desert surface by day (light blue)'],['#a37304','Mid-level thick cloud (tan)'],['#3a6a0a','Mid-level thin cloud (green)'],['#770101','Cold thick cloud (red)'],['#01002a','High thin ice cloud (black)'],['#0003d6','Very thin cloud over warm surface (blue)']]]]},
 DayNightCloudMicroCombo:{src:SRC_STAR,groups:[
  ['DAY — CLOUD PHASE',[[['#64beca','#857692'],'Low cloud, water droplets (cyan, lavender)'],['#5a9e28','Glaciating cloud (green)'],['#306c16','Snow (shades of green)'],['#e4b712','Thick high ice cloud (yellow)'],['#a2447a','Thin mid-level water cloud (magenta)'],['#ed4929','Thin high ice cloud (red-orange)'],[['#002060','#4472c4'],'Land surface (shades of blue)'],['#000000','Water surface (black)']]],
  ['NIGHT — MICROPHYSICS',[['#7dafd7','Fog (dull aqua to gray)'],['#7de6dc','Very low, warm cloud (aqua)'],['#91e691','Low, cool cloud (bright green)'],['#a0b96e','Mid-level water cloud (light green)'],['#95874b','Mid-level thick water/ice cloud (tan)'],['#0a0a8c','High thin ice cloud (dark blue)'],['#6e008c','High, very thin ice cloud (purple)'],['#820101','High thick cloud (dark red)'],['#01011e','High thin cloud (near black)'],[['#cc6028','#ffcc00'],'High, thick, very cold cloud (red / yellow, noisy)']]]]},
 DMW:{src:SRC_STAR,groups:[[null,[
  ['#ff0000','High-level winds, 100-400 mb (~7-14 km)'],['#00ffff','Mid-level winds, 400-700 mb (~3-7 km)'],['#ffff00','Low-level winds, below 700 mb (below ~3 km)']]]],note:'Barbs are drawn over a GeoColor background.'}
};

function esc(s){return String(s).replace(/[&<>]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;'}[c];});}
function sw(c){return Array.isArray(c)?'<i class="lg-sw" style="background:linear-gradient(135deg,'+c[0]+' 50%,'+c[1]+' 50%)"></i>':'<i class="lg-sw" style="background:'+c+'"></i>';}
function scaleHTML(s){
  var ticks=s.t.map(function(t,i){var a=i===0?'translateX(0)':i===s.t.length-1?'translateX(-100%)':'translateX(-50%)';return '<span style="left:'+t[0]+'%;transform:'+a+'">'+t[1]+'</span>';}).join('');
  return '<div class="lg-cap">'+s.cap+(s.u?' ('+s.u+')':'')+'</div>'+
   '<div class="lg-bar" style="background:linear-gradient(90deg,'+s.g+')"></div>'+
   '<div class="lg-ticks">'+ticks+'</div>'+
   ((s.lo||s.hi)?'<div class="lg-ends"><span>'+(s.lo?'◄ '+s.lo:'')+'</span><span>'+(s.hi?s.hi+' ►':'')+'</span></div>':'')+
   (s.note?'<div class="lg-note">'+s.note+'</div>':'')+
   '<div class="lg-src">SCALE: '+SRC_STAR+'</div>';
}
function keyHTML(k){
  return k.groups.map(function(g){
   return (g[0]?'<div class="lg-cap">'+g[0]+'</div>':'')+'<div class="lg-keys">'+g[1].map(function(it,i){return '<div class="lg-k">'+sw(it[0])+'<span class="lg-n">'+(i+1)+'</span><span>'+esc(it[1])+'</span></div>';}).join('')+'</div>';
  }).join('')+(k.note?'<div class="lg-note">'+k.note+'</div>':'')+'<div class="lg-src">KEY: '+k.src+'</div>';
}
function visHTML(b){
  return '<div class="lg-cap">REFLECTED SUNLIGHT (REFLECTANCE)</div><div class="lg-bar" style="background:linear-gradient(90deg,#000,#fff)"></div>'+
   '<div class="lg-ends"><span>◄ LOW</span><span>HIGH ►</span></div><div class="lg-note">'+VIS[b]+' Black at night: no sunlight to reflect.</div>';
}
/* Body HTML for one product, or '' if none */
function legendHTML(b){
  if(SCALES[b])return scaleHTML(SCALES[b]);
  if(KEYS[b])return keyHTML(KEYS[b]);
  if(VIS[b])return visHTML(b);
  return '';
}
window.goesLegendHTML=function(b){var h=legendHTML(b);return h?'<div class="lg-in-guide"><span class="g-k">COLOR KEY</span>'+h+'</div>':'';};

var css=''+
'#img-legend{position:absolute;left:14px;bottom:10px;z-index:11;width:340px;max-width:calc(100% - 28px);background:rgba(0,0,0,.88);border:1px solid var(--ydim2);font-size:9px;color:var(--y);display:none}'+
'#img-legend .lg-hd{display:flex;justify-content:space-between;align-items:center;gap:8px;width:100%;background:transparent;border:0;border-bottom:1px solid var(--ydim3);color:var(--y);font-family:inherit;font-size:9px;letter-spacing:.06em;text-transform:none;padding:5px 8px;cursor:pointer;text-align:left}'+
'#img-legend .lg-hd:hover{background:var(--ydim3)}#img-legend .lg-arrow{white-space:nowrap;flex:0 0 auto}'+
'#img-legend .lg-body{padding:6px 8px 7px;max-height:46vh;overflow-y:auto}'+
'#img-legend.collapsed .lg-body{display:none}#img-legend.collapsed .lg-hd{border-bottom:0}'+
'.lg-what{color:var(--ydim);line-height:1.45;margin-bottom:6px;text-transform:none}'+
'.lg-cap{font-size:8px;letter-spacing:.07em;opacity:.75;margin:4px 0 3px;text-transform:uppercase}'+
'.lg-bar{height:12px;border:1px solid var(--ydim2);background-origin:border-box!important}'+
'.lg-ticks{position:relative;height:12px;margin-top:1px;font-variant-numeric:tabular-nums}'+
'.lg-ticks span{position:absolute;top:0;font-size:8.5px;white-space:nowrap}'+
'.lg-ticks span::before{content:"";position:absolute;left:50%;top:-2px;width:1px;height:3px;background:var(--ydim)}'+
'.lg-ends{display:flex;justify-content:space-between;gap:8px;font-size:8px;opacity:.6;letter-spacing:.04em}'+
'.lg-keys{display:grid;grid-template-columns:1fr;gap:2px}'+
'.lg-k{display:flex;align-items:center;gap:6px;line-height:1.3;text-transform:none}'+
'.lg-sw{flex:0 0 auto;width:16px;height:11px;border:1px solid rgba(255,255,255,.25);display:inline-block}'+
'.lg-n{flex:0 0 auto;width:12px;opacity:.5;text-align:right;font-variant-numeric:tabular-nums}'+
'.lg-note{margin-top:5px;line-height:1.45;color:var(--ydim);text-transform:none}'+
'.lg-src{margin-top:5px;font-size:7.5px;opacity:.45;letter-spacing:.05em;text-transform:uppercase}'+
'.lg-in-guide{margin-top:6px;padding-top:6px;border-top:1px dashed var(--ydim3);font-size:10px}'+
'.lg-in-guide .lg-k{font-size:10px}.lg-in-guide .lg-ticks span{font-size:9px}.lg-in-guide .lg-bar{height:14px}'+
'@media(max-width:768px){#img-legend{left:8px;right:8px;width:auto;max-width:none;bottom:30px}#img-legend .lg-hd{min-height:34px;font-size:10px}#img-legend .lg-body{max-height:40vh}.lg-ticks span{font-size:9px}.lg-k{font-size:10px}}';

var box,cur='',LSKEY='gs_legend_open';
function isOpen(){try{var v=localStorage.getItem(LSKEY);if(v!==null)return v==='1';}catch(e){}return !window.matchMedia||!window.matchMedia('(max-width:768px)').matches;}
function ensure(){
  if(box)return box;
  var v=document.getElementById('view-loops');if(!v)return null;
  var st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
  box=document.createElement('div');box.id='img-legend';box.setAttribute('aria-live','polite');
  box.innerHTML='<button class="lg-hd" type="button" aria-expanded="true"><span class="lg-t"></span><span class="lg-arrow"></span></button><div class="lg-body"></div>';
  box.querySelector('.lg-hd').onclick=function(){setOpen(box.classList.contains('collapsed'));};
  v.appendChild(box);setOpen(isOpen(),true);return box;
}
function setOpen(o,silent){
  box.classList.toggle('collapsed',!o);
  box.querySelector('.lg-hd').setAttribute('aria-expanded',o?'true':'false');
  box.querySelector('.lg-arrow').textContent=o?'▾ HIDE':'▸ SHOW';
  if(!silent)try{localStorage.setItem(LSKEY,o?'1':'0');}catch(e){}
}
function show(b){
  if(!ensure())return;cur=b||'';
  var body=legendHTML(cur),info=(window.GUIDE_BANDS||{})[cur];
  if(!body){box.style.display='none';return;}
  var what=info?info[1].replace(/<sup[^>]*>.*?<\/sup>/g,''):'';
  box.querySelector('.lg-t').textContent='COLOR KEY // '+(info?info[0]:cur).split('µm').map(function(x){return x.toUpperCase();}).join('µm');
  box.querySelector('.lg-body').innerHTML=(what?'<div class="lg-what">'+what+'</div>':'')+body;
  box.style.display='block';
}
function hide(){cur='';if(box)box.style.display='none';}
window.updateImgLegend=show;

/* Follow the band that is actually on screen: hook SYNC and RESET */
document.addEventListener('DOMContentLoaded',function(){
  var s=window.syncImage,r=window.resetLoop;
  if(typeof s==='function')window.syncImage=function(){var bs=document.getElementById('bandSel'),ss=document.getElementById('sectorSel');var res=s.apply(this,arguments);if(bs&&ss&&bs.value&&ss.value)show(bs.value);return res;};
  if(typeof r==='function')window.resetLoop=function(){var res=r.apply(this,arguments);hide();return res;};
  if(window.lastBand)show(window.lastBand);
});
})();
