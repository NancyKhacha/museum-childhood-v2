import {CorridorScene} from './corridor-scene.js?v=20261023-v2m';
import {readerAtEnd,finalSections,smoothCamera} from './room-math.js?v=20261023-v2m';
import {clamp,travelGeometry,objectPosition,onScreen,depthLook,cameraPosition,endReached,displaySize} from './museum-engine.js?v=20261023-v2m';
const $=id=>document.getElementById(id),world=$('world'),travel=$('travel'),room=$('room'),reader=$('reader'),content=$('reader-content'),tabs=$('era-tabs'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
const corridor=new CorridorScene($('corridor-view'),room);
let restoreOnClose=true,readerEra=0,finalRead=false,lastFinalWheel=0,finalGestureStartedAtBottom=false,finalTouchStartedAtBottom=false,returningHome=false;
let displayScroll=0,lastFrame=0,lastSavedScroll=-1,journeyHeight=innerHeight,stageWidth=innerWidth,stageHeight=innerHeight;
// The era text opens by itself only on the first visit to each era; after that, from the ⓘ on its tab.
let seenEras=new Set();try{seenEras=new Set(JSON.parse(localStorage.getItem('museum-eras-seen-v2')||'[]'));}catch{}
let data,eraIndex=0,objects=[],geometry,positions={},dialogKind='',savedY=0,pending=false,touchY=0,endArmed=false,finalShown=false,switching=false;
function element(tag,props={},children=[]){const n=document.createElement(tag);for(const [k,v]of Object.entries(props)){if(k==='text')n.textContent=v;else if(k==='class')n.className=v;else n.setAttribute(k,String(v));}for(const child of children)n.append(child);return n;}
function stageLabel(name){return name.includes('VHS-кассета')?'VHS-кассета':name==='Телевизор с поворотной ручкой'?'Телевизор':name==='Телефон с игрой «Змейка»'?'Телефон со «Змейкой»':name;}
function paragraphs(text){return text.split(/\n\s*\n/).filter(Boolean).map(s=>element('p',{text:s.trim()}));}
function openReader(title,body,{image,caption,kind='object',extra}={}){if(!reader.open){savedY=scrollY;readerEra=eraIndex;restoreOnClose=true;reader.showModal();document.documentElement.classList.add('reader-open');}dialogKind=kind;reader.dataset.kind=kind;content.replaceChildren();if(image){const figure=element('figure',{class:'reader-figure'},[element('img',{src:image,alt:kind==='show'?'Герои и ведущие передачи «Спокойной ночи, малыши!»':'',class:'reader-image',width:1200,height:800})]);if(caption)figure.append(element('figcaption',{text:caption}));content.append(figure);}content.append(element('h2',{id:'dialog-title',text:title}));if(kind==='show'||kind==='final')content.append(watchButton());content.append(...paragraphs(body));if(extra)extra(content);reader.scrollTop=0;$('close-reader').focus({preventScroll:true});}
function closeReader({restore=true}={}){restoreOnClose=restore;reader.close();document.documentElement.classList.remove('reader-open');dialogKind='';if(restore)window.scrollTo({top:savedY,behavior:'instant'});}
reader.addEventListener('close',()=>{if(reader.open)return;document.documentElement.classList.remove('reader-open');dialogKind='';if(restoreOnClose&&readerEra===eraIndex)window.scrollTo({top:savedY,behavior:'instant'});});
$('close-reader').addEventListener('click',closeReader);
reader.addEventListener('click',e=>{if(e.target!==reader)return;const r=reader.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeReader();});
function showEpoch(){const era=data.eras[eraIndex];openReader(era.label,era.introduction,{kind:'epoch',extra:n=>{for(const expert of era.experts){const section=element('section',{class:'era-expert'}),identity=element('figure',{class:'era-expert-identity'},[element('div',{class:'era-expert-photo'+(expert.name.startsWith('Анна')?' anna':'')},[element('img',{src:expert.photo,alt:expert.name,width:88,height:104})]),element('figcaption',{},[element('h3',{text:expert.name}),element('p',{text:expert.role})])]);section.append(identity,element('div',{class:'era-expert-speech'},paragraphs(expert.quote)));n.append(section);}}});}
function infoMark(){const n=element('span',{class:'tab-info','aria-hidden':'true'});n.innerHTML='<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/><path d="M12 11v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="7.5" r="1.2" fill="currentColor"/></svg>';return n;}
function watchButton(){return element('a',{class:'primary watch-programme',href:data.watch.url,target:'_blank',rel:'noopener noreferrer',text:data.watch.label});}
function showFinal(){const sections=finalSections(data),speaker=data.finalSpeaker;finalShown=true;finalRead=false;lastFinalWheel=0;finalGestureStartedAtBottom=false;
 openReader('«Спокушки» сегодня','',{kind:'final',image:data.eras[4].showImage,caption:data.eras[4].showImageCaption,extra:n=>{
  const identity=element('figure',{class:'final-speaker'},[element('img',{src:speaker.photo,alt:speaker.name,width:128,height:166}),element('figcaption',{},[element('h3',{text:speaker.name}),element('p',{text:speaker.role})])]);
  const credit=element('small',{class:'photo-credit'},[document.createTextNode('Фото: '),element('a',{href:speaker.creditUrl,target:'_blank',rel:'noopener noreferrer',text:speaker.credit}),document.createTextNode(' · '),element('a',{href:speaker.license,target:'_blank',rel:'noopener noreferrer',text:'CC BY 4.0'})]);
  const editorial=element('section',{class:'final-editorial'},paragraphs(sections.intro.join('\n\n')));
  editorial.append(...paragraphs(sections.programme.join('\n\n')),...paragraphs(sections.ending.join('\n\n')));
  n.append(editorial,identity,credit,element('div',{class:'final-comment'},paragraphs(sections.comment.join('\n\n'))));
 }});if(atReaderEnd())finalRead=true;
}
function atReaderEnd(){return readerAtEnd(reader.scrollTop,reader.clientHeight,reader.scrollHeight);}
function returnToCover(){if(returningHome)return;returningHome=true;location.assign('index.html?v=20261023-v2m#start');}
reader.addEventListener('scroll',()=>{if(dialogKind==='final'&&atReaderEnd())finalRead=true;},{passive:true});

function showProgramme(){if(eraIndex===4){showFinal();return;}const era=data.eras[eraIndex];openReader('«Спокойной ночи, малыши!»',era.show,{image:era.showImage,caption:era.showImageCaption,kind:'show'});}
function savePosition(){positions[eraIndex]=scrollY;try{sessionStorage.setItem('museum-positions-v4',JSON.stringify(positions));}catch{}}
function update(now=performance.now()){
 pending=false;if(!data||!geometry)return;
 const dt=lastFrame?now-lastFrame:16;lastFrame=now;
 displayScroll=reduced.matches?scrollY:smoothCamera(displayScroll,scrollY,dt);
 if(Math.abs(displayScroll-scrollY)<.15)displayScroll=scrollY;
 const progress=clamp(displayScroll/geometry.scrollDistance),camera=cameraPosition(displayScroll,geometry);
 world.style.transform=`translateZ(${camera}px)`;room.style.transform='none';corridor.draw(camera/geometry.depth);
 for(const o of objects){
  const perspective=innerWidth<=600?850:1000,look=depthLook(o.position,camera,perspective),visible=!look.gone&&onScreen(o.position,o.size,camera,stageWidth,stageHeight,perspective);
  o.node.style.opacity=String(look.opacity);if(o.node.style.filter!==look.filter)o.node.style.filter=look.filter;o.node.style.visibility=visible?'visible':'hidden';o.node.tabIndex=visible?0:-1;o.node.style.pointerEvents=visible?'auto':'none';
  o.node.classList.toggle('distant',o.position.z-camera>(innerWidth<=600?900:1500));
  if(!o.show)o.node.style.setProperty('--caption-scale',String(Math.max(.25,1+(o.position.z-camera)/(innerWidth<=600?850:1000))));
 }
 const active=tabs.querySelector('[aria-selected=true]');if(active)active.style.setProperty('--era-progress',`${progress*100}%`);
 $('museum-stage').classList.toggle('at-screen',displayScroll>=geometry.approachDistance*.98);
 // The walking hint stands at the start of every corridor and steps aside once the visitor moves.
 $('travel-hint').hidden=scrollY>innerHeight*.5||reader.open;

 if(scrollY<geometry.scrollDistance-innerHeight*.6)endArmed=true;
 if(lastSavedScroll!==scrollY){savePosition();lastSavedScroll=scrollY;}
 if(endArmed&&endReached(displayScroll,geometry)&&!reader.open&&!switching){endArmed=false;if(eraIndex<4)selectEra(eraIndex+1,{restore:false,transition:true});else if(!finalShown)showFinal();}
 if(displayScroll!==scrollY)request();
}
function request(){if(!pending){pending=true;requestAnimationFrame(update);}}
function layout(){if(!data)return;const era=data.eras[eraIndex];for(const [i,b]of [...tabs.children].entries())b.querySelector('.tab-label').textContent=innerWidth<=600?['60–80-е','90-е','00-е','10-е','20-е'][i]:data.eras[i].label;document.body.style.setProperty('--museum-bottom',tabs.getBoundingClientRect().height+'px');geometry=travelGeometry(era.objects.length,journeyHeight);travel.style.height=`${geometry.scrollDistance+innerHeight}px`;const gallery=document.querySelector('.gallery'),width=innerWidth,height=gallery.clientHeight;stageWidth=gallery.clientWidth||width;stageHeight=height;corridor.resize(era.room,geometry.depth);for(let i=0;i<objects.length;i++){const o=objects[i];o.position=o.show?{x:0,y:innerWidth>600?-45:0,z:geometry.screenDepth}:objectPosition(i,width,height);const p=o.position;o.size=o.show?{width:640,height:480}:displaySize(o.aspect,i,width,height);if(!o.show){const size=o.size;o.node.style.setProperty('--object-width',size.width+'px');o.node.style.setProperty('--object-image-height',size.height+'px');o.node.style.setProperty('--tilt',p.tilt+'deg');o.node.style.setProperty('--drift-time',(7+i%4)+'s');o.node.style.setProperty('--drift-delay',(-i*1.13)+'s');}o.node.style.transform=`translate3d(calc(-50% + ${p.x}px),calc(-50% + ${p.y}px),${-p.z}px)`;}request();}
async function selectEra(index,{restore=true,transition=false}={}){
 if(switching)return;
 const veil=$('era-transition'),duration=reduced.matches?100:300;
 if(transition){switching=true;document.documentElement.classList.add('era-switching');
  if(reader.open)reader.animate([{opacity:1},{opacity:0}],{duration,fill:'forwards'});
  await veil.animate([{opacity:0},{opacity:.66}],{duration,easing:'ease-in-out',fill:'forwards'}).finished;
 }
if(objects.length)savePosition();if(reader.open)closeReader({restore:false});eraIndex=index;finalRead=false;finalShown=false;lastFinalWheel=0;const era=data.eras[index];document.title=era.label+' — Музей детства';room.src=era.background;await room.decode().catch(()=>{});await corridor.setImage(room,index).catch(()=>{});world.replaceChildren();objects=[];for(const [i,obj]of era.objects.entries()){const button=element('button',{type:'button',class:'exhibit','aria-label':obj.name},[element('div',{class:'artifact-visual'},[element('img',{src:obj.image,alt:'',width:480,height:360,loading:i<3?'eager':'lazy',decoding:'async'})]),element('span',{text:stageLabel(obj.name)})]);button.addEventListener('click',()=>openReader(obj.name,obj.body,{image:obj.image}));world.append(button);objects.push({node:button,aspect:obj.aspect});}
 const tv=era.television;const television=element('div',{class:'television'},[element('img',{class:'tv-case',src:tv.image,alt:'',width:tv.width,height:tv.height,decoding:'async'}),element('img',{class:'tv-programme',src:era.showImage,alt:'',width:1200,height:800,decoding:'async'})]);
 for(const [key,value]of ['left','top','width','height'].map((key,i)=>[key,tv.screen[i]]))television.style.setProperty('--screen-'+key,value+'%');television.style.setProperty('--screen-radius',tv.radius);
 const screen=element('button',{type:'button',class:'exhibit show-exhibit tv-era-'+index,'aria-label':'«Спокойной ночи, малыши!» — история передачи'},[television,element('span',{text:'«Спокойной ночи, малыши!»'})]);screen.addEventListener('click',showProgramme);world.append(screen);objects.push({node:screen,show:true});
 for(const [i,b]of [...tabs.children].entries()){b.setAttribute('aria-selected',String(i===index));b.tabIndex=i===index?0:-1;b.title=i===index?'Об этой эпохе':'';}layout();const y=restore?(positions[index]||0):0;savedY=y;displayScroll=y;lastFrame=0;window.scrollTo({top:y,behavior:'instant'});const url=new URL(location.href);url.searchParams.set('era',index);history.replaceState(null,'',url.search);endArmed=y<geometry.scrollDistance-innerHeight*.6;update();if(!seenEras.has(index)){seenEras.add(index);try{localStorage.setItem('museum-eras-seen-v2',JSON.stringify([...seenEras]));}catch{}showEpoch();}if(transition){
 for(const animation of reader.getAnimations())animation.cancel();
 const reveal=reduced.matches?120:320;
 reader.animate([{opacity:0},{opacity:1}],{duration:reveal,easing:'ease-out'});
 await veil.animate([{opacity:.66},{opacity:0}],{duration:reveal,easing:'ease-out',fill:'forwards'}).finished;
 for(const animation of veil.getAnimations())animation.cancel();
 document.documentElement.classList.remove('era-switching');switching=false;
 }}

reader.addEventListener('close',request);
addEventListener('scroll',request,{passive:true});addEventListener('resize',()=>{layout();});window.visualViewport?.addEventListener('resize',layout);reduced.addEventListener('change',request);
addEventListener('wheel',e=>{
 const down=e.deltaY>0;
 if(reader.open&&dialogKind==='final'){
  const now=performance.now();if(now-lastFinalWheel>220)finalGestureStartedAtBottom=atReaderEnd();lastFinalWheel=now;
  if(down&&finalRead&&finalGestureStartedAtBottom&&atReaderEnd()){e.preventDefault();returnToCover();}return;
 }
 if(!reader.open&&eraIndex===4&&down){if(finalRead){e.preventDefault();returnToCover();return;}if(finalShown&&endReached(scrollY,geometry)){e.preventDefault();showFinal();return;}}
 if(reader.open&&dialogKind==='epoch'&&!content.contains(e.target)&&e.target!==$('close-reader')){e.preventDefault();closeReader();}
},{passive:false});
addEventListener('touchstart',e=>{touchY=e.touches[0]?.clientY||0;finalTouchStartedAtBottom=eraIndex===4&&finalRead&&(!reader.open||(dialogKind==='final'&&atReaderEnd()));},{passive:true});
addEventListener('touchmove',e=>{const delta=touchY-(e.touches[0]?.clientY||0);if(finalTouchStartedAtBottom&&delta>45){e.preventDefault();returnToCover();return;}if(reader.open&&dialogKind==='epoch'&&!content.contains(e.target)&&Math.abs(delta)>14){e.preventDefault();closeReader();}},{passive:false});
addEventListener('keydown',e=>{if(e.repeat||e.shiftKey||!['ArrowDown','PageDown',' '].includes(e.key))return;if(e.key===' '&&e.target.closest('button,a'))return;if(eraIndex===4&&finalRead&&(!reader.open||(dialogKind==='final'&&atReaderEnd()))){e.preventDefault();returnToCover();}});

async function boot(){const response=await fetch('data/museum.json?v=20261023-v2m');if(!response.ok)throw Error('content');data=await response.json();try{positions=JSON.parse(sessionStorage.getItem('museum-positions-v4')||'{}');}catch{}for(const [i,era]of data.eras.entries()){const label=innerWidth<=600?['60–80-е','90-е','00-е','10-е','20-е'][i]:era.label;const b=element('button',{type:'button',role:'tab','aria-controls':'museum-stage','aria-selected':false},[element('span',{class:'tab-label',text:label}),infoMark()]);b.addEventListener('click',()=>{if(i===eraIndex)showEpoch();else selectEra(i,{transition:true});});b.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const target=e.key==='Home'?0:e.key==='End'?4:(i+(e.key==='ArrowRight'?1:4))%5;selectEra(target,{transition:true});tabs.children[target].focus({preventScroll:true});});tabs.append(b);}const param=Number(new URLSearchParams(location.search).get('era'));selectEra(Number.isInteger(param)?clamp(param,0,4):0,{restore:false});}
boot().catch(()=>{const box=element('div',{class:'load-error',role:'alert'},[element('p',{text:'Не удалось открыть музей. Попробуйте обновить страницу.'})]);const retry=element('button',{type:'button',text:'Обновить'});retry.addEventListener('click',()=>location.reload());box.append(retry);document.body.append(box);});
