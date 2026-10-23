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

test('viewing CTAs from the source copy are retained in every era and the finale',()=>{assert.deepEqual(data.eras.map(e=>e.watchProgramme),[true,true,true,true,true]);assert.equal(data.watch.url,'https://vkvideo.ru/video/playlist/-113057035_11?sh=4');assert.equal(data.watch.label,'«Спокойной ночи, малыши! Ждут друзей» в VK Видео');});

test('the final comment has an identified portrait with source and credit',()=>{assert.equal(data.finalSpeaker.name,'Александр Митрошенков');assert.ok(data.final.includes(data.finalSpeaker.name));assert.match(data.finalSpeaker.photo,/mitroshenkov\.jpg$/);assert.equal(data.finalSpeaker.license,'https://creativecommons.org/licenses/by/4.0/');});

import {puppetPose} from '../hero-math.js';
test('the cover has three era variants of each character and all approved introductory paragraphs',async()=>{
 const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
 for(const character of ['hryusha','stepashka','filya','karkusha'])assert.equal((html.match(new RegExp(`data-character="${character}"`,'g'))||[]).length,3);
 const normalize=s=>s.replace(/<[^>]*>/g,' ').replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
 for(const p of data.intro.split(/\n\s*\n/).filter(Boolean))assert.ok(normalize(html).includes(normalize(p)));
});
test('falling puppets enter sequentially and their lateral trajectories change direction',()=>{
 assert.equal(puppetPose(11,0,1280,720),null);assert.ok(puppetPose(11,8,1280,720));
 for(let i=0;i<12;i++){
  const poses=Array.from({length:101},(_,j)=>puppetPose(i,i*.65+j*.2,1280,720));
  const deltas=poses.slice(1).map((p,j)=>p.x-poses[j].x);
  assert.ok(deltas.some(d=>d>0)&&deltas.some(d=>d<0));
  assert.ok(poses.every(p=>p.height>100&&p.height<150));
  assert.ok(poses.slice(1).every((p,j)=>p.y>poses[j].y));
 }
});
