import {corridorVolume,smoothCamera,readerAtEnd,finalSections} from '../room-math.js';
import test from 'node:test';import assert from 'node:assert/strict';import {travelGeometry,objectPosition,visibility,cameraPosition,endReached,displaySize,objectDepth} from '../museum-engine.js';import {readFile} from 'node:fs/promises';
const data=JSON.parse(await readFile(new URL('../data/museum.json',import.meta.url)));
test('a corridor takes roughly 6–9 viewport scrolls, with generous world-space gaps',()=>{for(const era of data.eras)for(const h of [568,844,1080]){const g=travelGeometry(era.objects.length,h);assert.ok(g.scrollDistance/h>=6);assert.ok(g.scrollDistance/h<9);for(let i=1;i<era.objects.length;i++)assert.ok(objectDepth(i)-objectDepth(i-1)>=850);}});
test('nearby exhibits have varied composition and substantial projected size',()=>{const poses=Array.from({length:9},(_,i)=>objectPosition(i,1280,544));assert.ok(new Set(poses.map(p=>p.x)).size>5);assert.ok(new Set(poses.map(p=>p.y)).size>5);const first=data.eras[0].objects[0],size=displaySize(first.aspect,0,1280,544);assert.ok(size.width*1000/(1000+poses[0].z)>350);});
test('end screen remains ahead of the camera during the pause before the next era',()=>{for(const e of data.eras){const g=travelGeometry(e.objects.length,844);assert.equal(g.screenDepth-cameraPosition(g.approachDistance,g),360);assert.equal(cameraPosition(g.scrollDistance,g),g.depth);assert.equal(endReached(g.approachDistance,g),false);assert.equal(endReached(g.scrollDistance,g),true);assert.ok(g.endHold>400&&g.endHold<844);}});
test('artifacts stay opaque at every distance and are culled only behind the projection plane',()=>{assert.equal(visibility(300,1200),1);assert.equal(visibility(300,1300),0);assert.equal(visibility(8000,0),1);assert.equal(visibility(300,0),1);assert.equal(visibility(300,1150,850),0);});
test('physical corridor proportions stay fixed across desktop and mobile viewports',()=>{for(const [w,h] of [[390,660],[1280,544],[390,750]]){const r=corridorVolume(w,h,18000);assert.equal(r.halfWidth,480);assert.equal(r.halfHeight,390);assert.ok(r.far>18000);}});
test('camera smoothing never overshoots or reverses and settles after a scroll jump',()=>{let y=0;for(let i=0;i<170;i++){const next=smoothCamera(y,4000,16);assert.ok(next>=y&&next<=4000);y=next;}assert.ok(4000-y<.01);assert.ok(smoothCamera(4000,0,16)<4000);});
test('a final reader only reaches the end after its complete content is visible',()=>{assert.equal(readerAtEnd(0,600,3000),false);assert.equal(readerAtEnd(2300,600,3000),false);assert.equal(readerAtEnd(2400,600,3000),true);});
test('the single final reader retains the entire speaker comment, programme text and editorial ending',()=>{const s=finalSections(data);assert.equal(s.comment.length,4);assert.ok(s.comment.join(' ').includes('В мире больше нет ни одного примера'));assert.ok(s.comment.join(' ').includes('ее национальном и культурном феномене.'));for(const p of data.eras[4].show.trim().split(/\n\s*\n/))assert.ok(s.programme.includes(p));const rebuilt=[...s.intro,...s.comment,...s.ending].join('\n\n');for(const p of data.final.split(/\n\s*\n/).map(p=>p.trim()).filter(Boolean)){if(p.startsWith(data.finalSpeaker.name)||p.startsWith('Кнопка:'))continue;assert.ok(rebuilt.includes(p));}});

test('five eras retain all 55 object texts, transparent PNG paths and a separate programme photo',()=>{assert.equal(data.eras.length,5);assert.equal(data.eras.reduce((sum,e)=>sum+e.objects.length,0),55);for(const e of data.eras){assert.ok(e.about.length>300);assert.ok(e.show.length>500);assert.match(e.showImage,/show-\d.webp$/);for(const o of e.objects){assert.ok(o.body.length>100);assert.match(o.image,/\.png$/);}}});

test('each epoch opens with both complete expert quotes and photos',()=>{for(const e of data.eras){assert.equal(e.experts.length,2);assert.ok(e.introduction.length>200);for(const expert of e.experts){assert.ok(expert.quote.length>200);assert.match(expert.photo,/assets\/(anna|natalia)\.webp$/);assert.ok(e.about.includes(expert.quote));}}});

test('successive artifacts leave a central sightline at different camera depths',()=>{for(const era of data.eras)for(let i=0;i<era.objects.length-1;i++){const width=1280,height=544,poses=[i,i+1].map(j=>objectPosition(j,width,height));for(const camera of [poses[0].z-600,poses[0].z,poses[0].z+100]){const boxes=[i,i+1].map((j,k)=>{const size=displaySize(era.objects[j].aspect,j,width,height),scale=1000/(1000+poses[k].z-camera);return {left:width/2+(poses[k].x-size.width/2)*scale,right:width/2+(poses[k].x+size.width/2)*scale};}).sort((a,b)=>a.left-b.left);assert.ok(boxes[1].left-boxes[0].right>50,`${era.label}, pair ${i}`);assert.ok(boxes[0].right<width/2&&boxes[1].left>width/2);}}});

test('viewing CTAs from the source copy are retained in every era and the finale',()=>{assert.deepEqual(data.eras.map(e=>e.watchProgramme),[true,true,true,true,true]);assert.equal(data.watch.url,'https://vkvideo.ru/playlist/-113057035_11');assert.equal(data.watch.label,'Смотрите «Спокойной ночи, малыши! Ждут друзей» в VK Видео');});

test('the final comment has an identified portrait with source and credit',()=>{assert.equal(data.finalSpeaker.name,'Александр Митрошенков');assert.ok(data.final.includes(data.finalSpeaker.name));assert.match(data.finalSpeaker.photo,/mitroshenkov\.jpg$/);assert.equal(data.finalSpeaker.license,'https://creativecommons.org/licenses/by/4.0/');});

import {DESIGN,coverPlaces,flightPose,pivotAtFeet,coverMode,FLIGHT} from '../hero-math.js';
const coverHtml=await readFile(new URL('../index.html',import.meta.url),'utf8');
const coverIds=new Set([...coverHtml.matchAll(/class="falling puppet" data-id="([^"]+)"/g)].map(m=>m[1]));
test('the cover has archival and modern versions of every character and all approved introductory paragraphs',()=>{
 for(const character of ['hryusha','stepashka','filya','karkusha'])for(const era of ['archival','modern'])assert.ok(coverHtml.includes(`data-character="${character}" data-era="${era}"`));
 for(const mode of ['landscape','portrait'])for(const f of DESIGN[mode].figures)assert.ok(coverIds.has(f.id),f.id);
 assert.ok(DESIGN.landscape.figures.length>=18&&DESIGN.portrait.figures.length>=12);
 const normalize=s=>s.replace(/<[^>]*>/g,' ').replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
 for(const p of data.intro.split(/\n\s*\n/).filter(Boolean))assert.ok(normalize(coverHtml).includes(normalize(p)));
});
test('on the design screen sizes every puppet lands exactly where it stands in Figma',()=>{
 for(const mode of ['landscape','portrait']){
  const d=DESIGN[mode],[W,H]=d.frame,[x,y,w,h]=d.logo,{places}=coverPlaces({width:W,height:H,logo:{x,y,w,h}});
  assert.equal(coverMode(W,H),mode);assert.equal(places.size,d.figures.length);
  for(const f of d.figures){const p=places.get(f.id);for(const key of ['cx','cy','w','h'])assert.ok(Math.abs(p[key]-f[key])<1e-6,`${f.id} ${key}`);assert.equal(p.rot,f.rot);assert.equal(p.flip,f.flip);}
 }
});
test('on other screens the photo stretches between the wordmark and the screen edges without losing anyone',()=>{
 for(const [W,H,logo] of [[1920,1080,{x:615,y:316.4,w:690,h:345}],[1280,720,{x:295,y:136.4,w:690,h:345}],[1024,768,{x:204.8,y:195.2,w:614.4,h:307.2}],[375,667,{x:20,y:207.1,w:335,h:167.5}]]){
  const mode=coverMode(W,H),{places}=coverPlaces({width:W,height:H,logo});assert.equal(places.size,DESIGN[mode].figures.length);
  for(const p of places.values()){assert.ok(p.cx>-.25*W&&p.cx<1.25*W&&p.cy>-.25*H&&p.cy<1.3*H,`${W}×${H} ${p.id}`);assert.ok(p.h>.1*logo.h&&p.h<2.5*logo.h,`${W}×${H} ${p.id} size`);}
 }
});
test('puppets fly in from beyond the screen, the back of the photo first, then only sway on their place',()=>{
 const {places}=coverPlaces({width:1280,height:800,logo:{x:295,y:176.4,w:690,h:345}}),view={width:1280,height:800,centre:{x:640,y:348.9}};
 const done=FLIGHT.start+DESIGN.landscape.figures.length*FLIGHT.step+FLIGHT.duration;
 for(const p of places.values()){
  assert.equal(flightPose(p,0,view).alpha,0);
  const start=flightPose(p,FLIGHT.start+p.order*FLIGHT.step+.001,view);assert.ok(Math.hypot(start.x-p.cx,start.y-p.cy)>700,p.id);
  for(let t=done;t<done+40;t+=.53){const m=flightPose(p,t,view);assert.ok(m.landed&&Math.abs(m.x-p.cx)<1e-6&&Math.abs(m.y-p.cy)<1e-6&&Math.abs(m.angle-p.rot*Math.PI/180)<1e-9&&Math.abs(m.sway)<.02&&Math.abs(m.scale-1)<1e-9,p.id);}
 }
 // Swaying turns the puppet around its anchor, which stays where it was put.
 const r=pivotAtFeet(100,500,80,120,.04,.4,.7),c=Math.cos(.04),s=Math.sin(.04),fx=(.4-.5)*80,fy=(.7-.5)*120;
 assert.ok(Math.abs(r.x+c*fx-s*fy-100)<1e-9&&Math.abs(r.y+s*fx+c*fy-500)<1e-9);
});
test('both pages are ready for search and sharing: title, description, canonical, Open Graph, icons and valid structured data',async()=>{
 const base=(await readFile(new URL('../site-url.txt',import.meta.url),'utf8')).trim();
 for(const [page,url] of [['index.html',base],['museum.html',base+'museum.html']]){
  const html=await readFile(new URL('../'+page,import.meta.url),'utf8'),meta=(attr,name)=>(html.match(new RegExp(`<meta ${attr}="${name}" content="([^"]*)"`))||[])[1];
  const title=html.match(/<title>([^<]+)<\/title>/)[1],description=meta('name','description');
  assert.ok(title.length>=20&&title.length<=65,page+' title');assert.ok(description.length>=70&&description.length<=160,page+' description');
  assert.ok(html.includes(`<link rel="canonical" href="${url}">`),page+' canonical');assert.equal(meta('property','og:url'),url);
  for(const name of ['og:title','og:description','og:image','og:image:alt','og:site_name'])assert.ok(meta('property',name),page+' '+name);
  assert.equal(meta('property','og:image'),base+'assets/og-cover.jpg');assert.equal(meta('name','twitter:card'),'summary_large_image');
  assert.ok(html.includes('rel="icon" href="favicon.ico"')&&html.includes('rel="apple-touch-icon"'),page+' icons');
  const ld=[...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map(m=>JSON.parse(m[1]));
  assert.ok(ld.length===1&&ld[0]['@graph'].some(n=>n['@type']==='WebPage'&&n.url===url),page+' structured data');
  assert.equal((html.match(/<h1[\s>]/g)||[]).length,page==='index.html'?1:1,page+' one h1');
 }
});
test('the museum text version repeats every era, exhibit and the finale for robots and browsers without JavaScript',async()=>{
 const html=await readFile(new URL('../museum.html',import.meta.url),'utf8'),block=html.split('<!-- museum-text:start -->')[1].split('<!-- museum-text:end -->')[0];
 const text=block.replace(/<[^>]+>/g,' ').replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/&#x27;/g,"'").replace(/\s+/g,' ');
 const clean=s=>s.replace(/\s+/g,' ').trim();
 for(const era of data.eras){assert.ok(text.includes(clean(era.label)));assert.ok(text.includes(clean(era.introduction.split(/\n\s*\n/)[0])),era.label);for(const o of era.objects){assert.ok(text.includes(clean(o.name)),o.name);assert.ok(text.includes(clean(o.body.split(/\n\s*\n/)[0])),o.name+' body');}}
 assert.ok(text.includes(clean(data.finalSpeaker.name))&&text.includes('«Спокушки» сегодня'));
 assert.ok(html.indexOf('<noscript><div class="load-error">')<html.indexOf('<!-- museum-text:start -->'),'inside noscript');
});
