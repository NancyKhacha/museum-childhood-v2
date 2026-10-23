export const clamp=(v,min=0,max=1)=>Math.max(min,Math.min(max,v));
export const FIRST_DEPTH=650;
const intervals=[1200,1100,1300,1150,1350,1100];
const placements=[[-.34,-.13,1.03,-6],[.35,.13,1.16,5],[-.31,.19,.90,-3],[.36,-.15,1.10,4],[-.35,.03,1.18,-5],[.32,.19,.87,6],[-.37,-.18,1.15,2],[.34,.05,.96,-4],[-.32,.15,1.07,3],[.36,-.12,1.10,-3]];
export function objectDepth(index){let z=FIRST_DEPTH;for(let i=0;i<index;i++)z+=intervals[i%intervals.length];return z;}
export function travelGeometry(count,viewportHeight){const screenDepth=objectDepth(count)+300,approachDistance=(count+1)*viewportHeight*.58;const endHold=viewportHeight*.65;return {depth:screenDepth-360,screenDepth,approachDistance,endHold,scrollDistance:approachDistance+endHold};}
export function cameraPosition(scroll,geometry){return clamp(scroll/geometry.approachDistance)*geometry.depth;}
export function objectPosition(index,width,height){const [x,y,scale,tilt]=placements[index%placements.length],mobile=width<=600;return {x:mobile?(index%2?1:-1)*width*(.32+(index%3)*.025):x*width,y:(mobile?[-.14,.16,-.10,.12][index%4]:y)*height,z:objectDepth(index),scale,tilt:mobile?0:tilt*.35};}
export function displaySize(aspect,index,width,height){const p=placements[index%placements.length],scale=p[2],mobile=width<=600,maxW=Math.min(mobile?width*.6:width*.48,650)*scale,maxH=Math.min(mobile?height*.26:height*.76,480)*scale;let w=maxW,h=w/aspect;if(h>maxH){h=maxH;w=h*aspect;}return {width:w,height:h};}
// Items stay opaque from the vanishing point until they leave through the sides.
// Only cull behind the projection plane, where CSS would otherwise mirror them.
export function visibility(depth,camera,perspective=1000){return depth-camera> -perspective+30?1:0;}

export function endReached(scroll,geometry){return scroll>=geometry.scrollDistance-2;}
// Chrome keeps a giant raster for any 3D layer near the eye and drops its tiles
// under memory pressure; walking back then shows half-painted items with no
// caption. An item is shown only while some of it is in frame and it is less
// than five times its resting size, so its layer never grows that large.
export function onScreen(position,size,camera,width,height,perspective=1000){
 const eye=perspective-(camera-position.z);if(eye<perspective/5)return false;
 const s=perspective/eye,halfW=size.width/2*s,halfH=(size.height/2+80)*s;
 return Math.abs(position.x*s)-halfW<width/2&&Math.abs(position.y*s)-halfH<height/2;
}
// Aerial perspective: far items are softened and paler, as if across a long room;
// items that have come very close fade out instead of sweeping across a phone screen.
export function depthLook(position,camera,perspective=1000){
 const s=perspective/Math.max(1,perspective-(camera-position.z));
 const far=clamp((.62-s)/.42),near=clamp((s-1.7)/.9);
 const blur=Math.round(far*1.1/Math.max(s,.2)*2)/2;
 return {opacity:Math.round((1-.45*far-near)*100)/100,filter:blur?`blur(${blur}px) saturate(${Math.round((1-.35*far)*20)/20})`:'',gone:near>=1};
}
