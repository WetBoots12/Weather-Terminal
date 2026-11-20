/* NWS GROUND — layout: hero (location + current), hour scrubber (slider + wind dial + readouts),
   one tabbed graph with an hour cursor, 7-day list. Depends on helpers in index.html
   (f2c, mph2kph, fmtHour, fmtDay, sparkSVG, degToCardinal, _esc, _nwsUnits). */
var _nx=null,_nxHr=0,_nxGraph='temp',_nxRO=null;
try{_nxGraph=localStorage.getItem('gs_nx_graph')||'temp';}catch(e){}
var _CARD={N:0,NNE:22.5,NE:45,ENE:67.5,E:90,ESE:112.5,SE:135,SSE:157.5,S:180,SSW:202.5,SW:225,WSW:247.5,W:270,WNW:292.5,NW:315,NNW:337.5};

/* value of an NWS grid series at time t (validTime = start/duration) */
function _nxGridAt(prop,t){if(!prop||!prop.values)return null;for(var i=0;i<prop.values.length;i++){var v=prop.values[i],p=v.validTime.split('/'),s=new Date(p[0]).getTime(),m=(p[1]||'PT1H').match(/P(?:(\d+)D)?T?(?:(\d+)H)?/),d=((+(m&&m[1])||0)*24+(+(m&&m[2])||1))*3600000;if(t>=s&&t<s+d)return v.value;}return null;}
/* convert grid speed (km/h or m/s, per uom) to display units */
function _nxSpd(prop,v){if(v==null)return null;var kph=/m_s/.test(prop&&prop.uom||'')?v*3.6:v;return Math.round(_nwsUnits==='imperial'?kph/1.60934:kph);}
function _nxTemp(c){return c==null?null:(_nwsUnits==='imperial'?Math.round(c*9/5+32):Math.round(c*10)/10);}

function _nxHours(){
  var D=_nx,gp=D.gridData?D.gridData.properties:null,imp=_nwsUnits==='imperial';
  return(D.hourly||[]).map(function(h){
    var t=new Date(h.startTime).getTime(),ws=String(h.windSpeed||'').match(/\d+/g),w=ws?Math.max.apply(null,ws.map(Number)):null,
        dewC=h.dewpoint&&h.dewpoint.value!=null?h.dewpoint.value:null,deg=gp?_nxGridAt(gp.windDirection,t):null;
    if(deg==null)deg=_CARD[h.windDirection];
    return{t:t,temp:imp?h.temperature:f2c(h.temperature),dew:_nxTemp(dewC),rh:h.relativeHumidity?h.relativeHumidity.value:null,
      pop:h.probabilityOfPrecipitation?(h.probabilityOfPrecipitation.value||0):0,wind:w==null?null:(imp?w:Math.round(w*1.60934)),
      gust:gp?_nxSpd(gp.windGust,_nxGridAt(gp.windGust,t)):null,deg:deg,dir:h.windDirection||degToCardinal(deg),
      sky:gp?_nxGridAt(gp.skyCover,t):null,feels:gp?_nxTemp(_nxGridAt(gp.apparentTemperature,t)):null,short:h.shortForecast||'',day:h.isDaytime};
  });
}

/* 48-h series for the graph tabs */
function _nxSeries(){
  var D=_nx,imp=_nwsUnits==='imperial',gp=D.gridData?D.gridData.properties:null,H=48,tu=imp?'°F':'°C',wu=imp?'MPH':'KM/H',pu=imp?'INHG':'HPA';
  function pa(v){return imp?Math.round(v*0.0002953*100)/100:Math.round(v/10)/10;}
  function grid(k,f){return gp&&gp[k]?parseGridTS(gp[k],H).map(function(d){return{t:d.t,v:d.v==null?null:f(d.v)};}):[];}
  var S=[],hrs=_nxHours();
  var temp=grid('temperature',_nxTemp);if(!temp.length)temp=hrs.map(function(h){return{t:h.t,v:h.temp};});
  S.push({k:'temp',lbl:'TEMP',unit:tu,d:temp,c:'#ffb400',o:{dec:imp?0:1}});
  var dew=grid('dewpoint',_nxTemp);if(dew.length)S.push({k:'dew',lbl:'DEW PT',unit:tu,d:dew,c:'#00cfff',o:{dec:imp?0:1}});
  var rh=grid('relativeHumidity',function(v){return v;});if(!rh.length)rh=hrs.map(function(h){return{t:h.t,v:h.rh};});
  S.push({k:'rh',lbl:'HUMIDITY',unit:'%',d:rh,c:'#4ade80',o:{dec:0}});
  var sky=grid('skyCover',function(v){return v;});if(sky.length)S.push({k:'sky',lbl:'SKY',unit:'%',d:sky,c:'#c4b5fd',o:{dec:0}});
  var pop=grid('probabilityOfPrecipitation',function(v){return v||0;});if(!pop.length)pop=hrs.map(function(h){return{t:h.t,v:h.pop};});
  S.push({k:'pop',lbl:'PRECIP',unit:'%',d:pop,c:'#38bdf8',o:{dec:0,minRange:10}});
  var wind=gp&&gp.windSpeed?parseGridTS(gp.windSpeed,H).map(function(d){return{t:d.t,v:_nxSpd(gp.windSpeed,d.v)};}):hrs.map(function(h){return{t:h.t,v:h.wind};});
  S.push({k:'wind',lbl:'WIND',unit:wu,d:wind,c:'#fb923c',o:{dec:0,minRange:4}});
  /* pressure: observed history + forecast, 12-h window, outliers removed */
  var pr=(D.obsPress||[]).filter(function(d){return d.v!=null;}).map(function(d){return{t:d.t,v:pa(d.v)};});
  var pp=gp&&(gp.barometricPressure||gp.pressure);if(pp)parseGridTS(pp,H).forEach(function(d){if(d.v!=null)pr.push({t:d.t,v:pa(d.v)});});
  pr.sort(function(a,b){return a.t-b.t;});var now=Date.now(),m=[];pr.forEach(function(d){if(d.t>=now-216e5&&d.t<=now+216e5&&(!m.length||d.t-m[m.length-1].t>3e5))m.push(d);});
  if(m.length>=4){var s=m.map(function(d){return d.v;}).sort(function(a,b){return a-b;}),q1=s[Math.floor(s.length/4)],q3=s[Math.floor(s.length*3/4)],f=Math.max(1.5*(q3-q1),imp?0.1:3);m=m.filter(function(d){return d.v>=q1-f&&d.v<=q3+f;});}
  if(m.length>=2)S.push({k:'pres',lbl:'PRESSURE',unit:pu+' · 12H',d:m,c:'#f87171',o:{minRange:imp?0.1:3,dec:imp?2:1}});
  return S;
}

function _nxDial(deg,spd,unit){
  var c=60,r=46,t='';
  for(var a=0;a<360;a+=22.5){var big=a%90===0,rad=a*Math.PI/180,r1=r-(big?7:4);t+='<line x1="'+(c+Math.sin(rad)*r1).toFixed(1)+'" y1="'+(c-Math.cos(rad)*r1).toFixed(1)+'" x2="'+(c+Math.sin(rad)*r).toFixed(1)+'" y2="'+(c-Math.cos(rad)*r).toFixed(1)+'" class="nx-tick'+(big?' big':'')+'"/>';}
  ['N','E','S','W'].forEach(function(l,i){var rad=i*Math.PI/2,rr=r+9;t+='<text x="'+(c+Math.sin(rad)*rr).toFixed(1)+'" y="'+(c-Math.cos(rad)*rr+3).toFixed(1)+'" class="nx-dl">'+l+'</text>';});
  var arrow=deg==null?'':'<g transform="rotate('+deg+' '+c+' '+c+')"><line x1="'+c+'" y1="'+(c-r+12)+'" x2="'+c+'" y2="'+(c+r-6)+'" class="nx-tail"/><path d="M'+c+' '+(c-r+16)+' L'+(c-7)+' '+(c-r+1)+' L'+(c+7)+' '+(c-r+1)+' Z" class="nx-arrow"/></g>';
  return'<svg class="nx-dial" viewBox="-6 -6 132 132" width="132" height="132"><circle cx="'+c+'" cy="'+c+'" r="'+r+'" class="nx-ring"/>'+t+arrow+'<circle cx="'+c+'" cy="'+c+'" r="19" class="nx-hub"/><text x="'+c+'" y="'+(c+3)+'" class="nx-spd">'+(spd==null?'—':spd)+'</text><text x="'+c+'" y="'+(c+13)+'" class="nx-su">'+unit+'</text></svg>';
}

function _nxHourPanel(){
  var n=_nx.hours.length;if(!n)return'';
  return'<div class="nx-hour nx-card"><div class="nx-hour-hd"><span class="nx-k">HOUR</span><span id="nx-hlbl" class="nx-hlbl"></span></div>'+
    '<div class="nx-hour-body"><div class="nx-dial-wrap"><div id="nx-dial"></div><div id="nx-dir" class="nx-dir"></div></div><div id="nx-read" class="nx-read"></div></div>'+
    '<input type="range" id="nx-sl" class="nx-sl" min="0" max="'+(n-1)+'" value="'+_nxHr+'" oninput="nwsSetHour(+this.value)" aria-label="Forecast hour">'+
    '<div class="nx-sl-ticks" id="nx-ticks"></div></div>';
}
function _nxGraphBox(){
  return'<div class="nx-graph nx-card"><div class="nx-gtabs" role="tablist">'+_nx.series.map(function(s){return'<button role="tab" data-k="'+s.k+'" onclick="nwsGraphTab(\''+s.k+'\')">'+s.lbl+'</button>';}).join('')+'<span class="nx-gunit" id="nx-gunit"></span></div><div class="nx-gwrap"><div id="nx-gsvg"></div><div class="nx-cur" id="nx-cur"><span id="nx-curv"></span></div></div></div>';
}
/* 7-day: day/night periods paired into cards; the selected card's NWS text forecast shows below */
var _nxDay=0;
function _nxDayList(){
  var P=_nx.periods,imp=_nwsUnits==='imperial',out=[],i=0;
  function T(p){return Math.round(imp?p.temperature:f2c(p.temperature));}
  while(i<P.length){var p=P[i],day=null,night=null;if(p.isDaytime){day=p;if(P[i+1]&&!P[i+1].isDaytime){night=P[i+1];i+=2;}else i++;}else{night=p;i++;}
    var lead=day||night,nm=lead.name.toUpperCase().replace(/ NIGHT$/,''),pop=lead.probabilityOfPrecipitation&&lead.probabilityOfPrecipitation.value;
    out.push({name:/^(THIS|TODAY|TONIGHT|OVERNIGHT)/.test(nm)?'TODAY':nm.slice(0,3),full:nm,hi:day?T(day):null,lo:night?T(night):null,short:lead.shortForecast||'',pop:pop,day:day,night:night});}
  return out;
}
function _nxDays(){
  _nx.days=_nxDayList();if(_nxDay>=_nx.days.length)_nxDay=0;
  return'<div class="nx-dcards">'+_nx.days.map(function(d,i){return'<button class="nx-dc nx-card" data-d="'+i+'" onclick="nwsDay('+i+')"><div class="nx-k">'+_esc(d.name)+'</div><div class="nx-dc-t"><b>'+(d.hi!=null?d.hi+'°':'—')+'</b><span>'+(d.lo!=null?d.lo+'°':'')+'</span></div><div class="nx-dc-s">'+_esc(d.short)+'</div>'+(d.pop?'<div class="nx-pop">'+_esc(d.pop)+'% PRECIP</div>':'')+'</button>';}).join('')+'</div>'+
    '<div class="nx-text nx-card" id="nx-text"></div>';
}
function nwsDay(i){
  if(!_nx||!_nx.days)return;_nxDay=i;var d=_nx.days[i];if(!d)return;
  document.querySelectorAll('.nx-dc').forEach(function(b){b.classList.toggle('on',+b.getAttribute('data-d')===i);});
  var t=document.getElementById('nx-text');if(!t)return;
  t.innerHTML='<div class="nx-text-hd"><span class="nx-k">NWS TEXT FORECAST</span><span class="nx-k">'+_esc(_nx.office||'')+'</span></div>'+[d.day,d.night].filter(Boolean).map(function(p){return'<p><b>'+_esc(p.name)+'</b> '+_esc(p.detailedForecast||p.shortForecast||'')+'</p>';}).join('');
}
function _nxHero(){
  var D=_nx,c=D.periods[0],h=D.hours[0]||{},imp=_nwsUnits==='imperial',tu=imp?'°F':'°C',wu=imp?'MPH':'KM/H',temp=h.temp!=null?Math.round(h.temp):Math.round(imp?c.temperature:f2c(c.temperature));
  var meta=[h.feels!=null?'FEELS '+Math.round(h.feels)+'°':null,h.wind!=null?'WIND '+_esc(h.dir)+' '+_esc(h.wind)+' '+wu:null,h.rh!=null?'HUMIDITY '+_esc(h.rh)+'%':null,'PRECIP '+_esc(h.pop||0)+'%'].filter(Boolean);
  return'<div class="nx-hero"><div class="nx-loc"><div class="nx-place">'+_esc(D.place)+'</div><div class="nx-sub">'+_esc(D.sub)+'</div></div>'+
    '<div class="nx-now"><div class="nx-temp">'+_esc(temp)+'<small>'+tu+'</small></div><div class="nx-now-txt"><div class="nx-cond">'+_esc(h.short||c.shortForecast)+'</div><div class="nx-meta">'+meta.map(function(m){return'<span>'+m+'</span>';}).join('')+'</div></div></div>'+
    '<div class="nx-today"><span class="nx-k">'+_esc(c.name)+'</span> '+_esc(c.detailedForecast||c.shortForecast)+'</div></div>';
}
/* alerts + special weather statements: always present so "nothing active" is visible too */
var _SEV={Extreme:1,Severe:2,Moderate:3,Minor:4,Unknown:5};
/* NWS products hard-wrap lines at ~69 chars: rejoin lines, keep blank-line paragraph breaks */
function _nxParas(t){return String(t||'').split(/\n\s*\n/).map(function(x){x=x.replace(/\s*\n\s*/g,' ').trim();return x?'<p>'+_esc(x)+'</p>':'';}).join('');}
function _nxAlerts(){
  var A=(_nx.alerts||[]).slice().sort(function(a,b){return(_SEV[a.properties.severity]||5)-(_SEV[b.properties.severity]||5);}),off=/^[A-Z]{3}$/.test(_nx.office||'')?_nx.office:'';
  var hwo=off?'<a href="https://forecast.weather.gov/product.php?site='+off+'&issuedby='+off+'&product=HWO" target="_blank">HAZARDOUS WEATHER OUTLOOK ↗</a>':'';
  function tm(s){return s?fmtDay(new Date(s).getTime())+' '+fmtHour(new Date(s).getTime()):'—';}
  var rows=A.map(function(a){var p=a.properties,sev=_esc(String(p.severity||'Unknown').toLowerCase());
    return'<div class="nx-al sev-'+sev+'" onclick="this.classList.toggle(\'open\')"><div class="nx-al-h"><b>'+_esc(p.event||'ALERT')+'</b><span class="nx-al-t">'+tm(p.onset||p.effective)+' → '+tm(p.ends||p.expires)+'</span><span class="nx-al-x">▾</span></div>'+
      '<div class="nx-al-hl">'+_esc(p.headline||'')+'</div><div class="nx-al-b">'+_nxParas(p.description)+_nxParas(p.instruction)+'<div class="nx-al-src">'+_esc(p.senderName||'')+'</div></div></div>';}).join('');
  return'<div class="nx-alerts nx-card'+(A.length?' has':'')+'"><div class="nx-alerts-hd"><span class="nx-k">ALERTS &amp; SPECIAL WEATHER STATEMENTS'+(A.length?' <i>'+A.length+'</i>':'')+'</span>'+hwo+'</div>'+
    (rows||'<div class="nx-al-none"><span class="nx-ok"></span>NO ACTIVE ALERTS OR STATEMENTS FOR THIS LOCATION</div>')+'</div>';
}
function _nxLinks(){var D=_nx;return'<div class="nx-links">NWS: <a href="https://forecast.weather.gov/MapClick.php?lat='+encodeURIComponent(D.lat)+'&lon='+encodeURIComponent(D.lon)+'&FcstType=graphical" target="_blank">GRAPHICAL ↗</a> <a href="https://forecast.weather.gov/MapClick.php?lat='+encodeURIComponent(D.lat)+'&lon='+encodeURIComponent(D.lon)+'" target="_blank">FORECAST ↗</a> <a href="https://radar.weather.gov/" target="_blank">RADAR ↗</a> <a href="https://www.nhc.noaa.gov" target="_blank">NHC ↗</a></div>';}

function renderNWS(){
  if(!_nx)return;var el=document.getElementById('nws-content');if(!el)return;
  _nx.hours=_nxHours();_nx.series=_nxSeries();if(_nxHr>=_nx.hours.length)_nxHr=0;
  if(!_nx.series.some(function(s){return s.k===_nxGraph;}))_nxGraph='temp';
  el.innerHTML=_nxHero()+_nxAlerts()+'<div class="nx-cols">'+_nxHourPanel()+_nxGraphBox()+'</div><div class="nx-shd">7-DAY</div>'+_nxDays()+_nxLinks();
  _nxTicks();nwsGraphTab(_nxGraph,true);nwsSetHour(_nxHr);nwsDay(_nxDay);
  var tb=document.querySelector('.tab-btn[onclick*="\'nws\'"]'),n=(_nx.alerts||[]).length;if(tb)tb.setAttribute('data-alerts',n?n:'');
  if(!_nxRO&&window.ResizeObserver){_nxRO=new ResizeObserver(function(){var g=document.getElementById('nx-gsvg');if(g&&g.clientWidth&&g._w!==g.clientWidth)nwsGraphTab(_nxGraph,true);});_nxRO.observe(el);}
}
function _nxTicks(){var t=document.getElementById('nx-ticks');if(!t)return;var H=_nx.hours,n=H.length,s='';for(var i=0;i<n;i++){var o=_tzParts(H[i].t),hr=o?o.hour+o.dayPeriod:'';if(hr==='12AM'||i===0)s+='<span style="left:'+(i/(n-1)*100).toFixed(2)+'%">'+(i===0?'NOW':fmtDay(H[i].t))+'</span>';}t.innerHTML=s;}
function nwsSetHour(i){
  if(!_nx||!_nx.hours.length)return;_nxHr=Math.max(0,Math.min(_nx.hours.length-1,i));var h=_nx.hours[_nxHr],imp=_nwsUnits==='imperial',tu=imp?'°F':'°C',wu=imp?'MPH':'KM/H';
  var sl=document.getElementById('nx-sl');if(sl&&+sl.value!==_nxHr)sl.value=_nxHr;
  if(sl)sl.style.setProperty('--p',(_nxHr/(_nx.hours.length-1)*100)+'%');
  var lb=document.getElementById('nx-hlbl');if(lb)lb.textContent=fmtDay(h.t)+' '+fmtHour(h.t)+(_nxHr===0?' · NOW':' · +'+_nxHr+'H');
  var d=document.getElementById('nx-dial');if(d)d.innerHTML=_nxDial(h.deg,h.wind,wu);
  var dr=document.getElementById('nx-dir');if(dr)dr.textContent=h.deg==null?'—':'FROM '+h.dir+' · '+Math.round(h.deg)+'°'+(h.gust&&h.gust>h.wind?' · GUST '+h.gust:'');
  var R=[['TEMP',Math.round(h.temp)+tu,1],['FEELS',h.feels!=null?Math.round(h.feels)+tu:'—'],['PRECIP',_esc(h.pop)+'%'],['HUMIDITY',h.rh!=null?_esc(h.rh)+'%':'—'],['DEW PT',h.dew!=null?Math.round(h.dew)+tu:'—'],['SKY',h.sky!=null?_esc(h.sky)+'%':'—']];
  var rd=document.getElementById('nx-read');if(rd)rd.innerHTML='<div class="nx-cond2">'+_esc(h.short)+'</div>'+R.map(function(r){return'<div class="nx-ri'+(r[2]?' big':'')+'"><span class="nx-k">'+r[0]+'</span><b>'+r[1]+'</b></div>';}).join('');
  _nxCursor();
}
function _nxCursor(){
  var c=document.getElementById('nx-cur'),g=document.getElementById('nx-gsvg');if(!c||!g||!g._r)return;var h=_nx.hours[_nxHr],r=g._r;
  if(!h||h.t<r.t0-54e5||h.t>r.t1+54e5){c.style.display='none';return;}
  var x=r.px+Math.max(0,Math.min(1,(h.t-r.t0)/(r.t1-r.t0||1)))*(r.w-2*r.px);c.style.display='block';c.style.left=x+'px';
  var s=g._s,best=null;s.d.forEach(function(p){if(p.v!=null&&(!best||Math.abs(p.t-h.t)<Math.abs(best.t-h.t)))best=p;});
  var v=document.getElementById('nx-curv');v.textContent=best?(+best.v).toFixed(s.o.dec!=null?s.o.dec:0):'';v.classList.toggle('flip',x>r.w-60);
}
function nwsGraphTab(k,keep){
  if(!_nx)return;var s=_nx.series.filter(function(x){return x.k===k;})[0]||_nx.series[0];_nxGraph=s.k;if(!keep)try{localStorage.setItem('gs_nx_graph',s.k)}catch(e){}
  document.querySelectorAll('.nx-gtabs button').forEach(function(b){b.classList.toggle('on',b.getAttribute('data-k')===s.k);});
  var g=document.getElementById('nx-gsvg');if(!g)return;var w=g.clientWidth;if(!w)return;
  g._w=w;g.innerHTML=sparkSVG(s.d,s.c,w,{dec:s.o.dec,minRange:s.o.minRange,h:180});g._r=window._sparkRng;g._s=s;
  var u=document.getElementById('nx-gunit');if(u)u.textContent=s.lbl+' ('+s.unit+')';
  var cur=document.getElementById('nx-cur');if(cur)cur.style.setProperty('--c',s.c);
  _nxCursor();
}
document.addEventListener('keydown',function(e){if(!_nx||!document.getElementById('view-nws').classList.contains('active'))return;var t=e.target.tagName;if(t==='INPUT'&&e.target.type!=='range'||t==='SELECT')return;if(e.target.id==='nx-sl')return;if(e.key==='ArrowRight'){nwsSetHour(_nxHr+1);e.preventDefault();}else if(e.key==='ArrowLeft'){nwsSetHour(_nxHr-1);e.preventDefault();}});
