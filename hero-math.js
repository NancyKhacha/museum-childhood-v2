// The cover is a group photo of the «Спокойной ночи, малыши!» puppets, arranged by hand in Figma
// (file «Музей детства — обложка-толпа (слои)», frames «Ноутбук 1280×800» and «Телефон 390×844»).
// Each puppet flies in from outside the screen and lands exactly on its place from the design; then it only sways.
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));

// A place from the design: centre of the picture, its size, tilt in degrees (clockwise) and a mirror flag.
// The lists go from the back of the photo to the front, as the layers in Figma.
const fig=(id,cx,cy,w,h,rot=0,flip=false)=>({id,cx,cy,w,h,rot,flip});
export const DESIGN={
 landscape:{frame:[1280,800],logo:[295,176.4,690,345],figures:[
  fig('stepashka-jacket',194.3,319.7,201.9,439,3),
  fig('stepashka-red',1224.8,234.9,132.5,298,-3),
  fig('filya-tennis',763.8,258.6,297.1,419.1,-2),
  fig('karkusha-bow',186.3,385.7,212.5,277.5,4),
  fig('stepashka-yellow',360.4,243.2,215.8,422.4,-4),
  fig('hryusha-1990',923.1,259.6,140.3,271.1),
  fig('filya-grey',563.2,170,184.4,214),
  fig('karkusha-tea',1123.3,328.9,273.1,339.9,3),
  fig('stepashka-skate',18.5,469.3,311.2,512.2,-3),
  fig('hryusha-orange',1219.7,502.2,250.5,324,4),
  fig('karkusha-hat',238,587.7,232.4,405.1,2),
  fig('stepashka-guitar',1102.6,584.9,406.6,568.8,-4),
  fig('filya-suit',136.2,588.3,266.9,455.3,3),
  fig('filya-lie',903.4,698.8,429.2,181.7),
  fig('hryusha-lie',413,697,290,192),
  fig('karkusha-beret',1195.9,657,191.4,355.8),
  fig('stepashka-scarf',213.7,721.6,200.6,374.4,0,true),
  fig('filya-red',1016.3,685.6,289.4,360),
  fig('hryusha-teal',100.8,703.9,241.7,353.2)]},
 portrait:{frame:[390,844],logo:[20,292,350,175],figures:[
  fig('filya-tennis',304.9,202.1,198.1,279.4,2,true),
  fig('hryusha-orange',214.7,189.8,133.6,172.8,4),
  fig('hryusha-1990',44,236.5,101.9,197),
  fig('filya-grey',117,155.9,123.9,143.9,0,true),
  fig('karkusha-hat',235.8,328.5,134.6,234.6,2),
  fig('stepashka-guitar',368.6,293.9,231.1,323.3,-4),
  fig('stepashka-scarf',150.6,672.1,105.1,196.2,0,true),
  fig('karkusha-beret',362,686,146,272),
  fig('filya-red',246,731.5,190,237),
  fig('hryusha-teal',71.4,742.3,168.8,246.6),
  fig('karkusha-tea',171.6,269.4,170.4,212.1,3),
  fig('filya-suit',74.4,358.4,149.7,255.4,-3,true)]}
};
export const coverMode=(width,height)=>height>width*1.1?'portrait':'landscape';

// On the design's own screen sizes the places are exact. On other screens the design is stretched like a 9-slice:
// the strips left of, inside and right of the wordmark (and above, beside, below it) each map onto the same strip
// of the actual cover, so puppets stay tied both to the letters and to the screen edges.
// Sizes follow the wordmark, plus part of the stretch of the strip the puppet stands in.
function slice(v,a,len,size,A,LEN,SIZE,k){
 if(v<0)return v*k;                                    // beyond the design frame: keep the overhang
 if(v<a)return v/a*A;
 if(v<=a+len)return A+(v-a)*LEN/len;
 if(v<=size)return A+LEN+(v-a-len)/(size-a-len)*(SIZE-A-LEN);
 return SIZE+(v-size)*k;
}
function stretch(v,a,len,size,A,LEN,SIZE){return v<a?A/a:v<=a+len?LEN/len:(SIZE-A-LEN)/(size-a-len);}
export function coverPlaces({width:W,height:H,logo:L}){
 const mode=coverMode(W,H),d=DESIGN[mode],[W0,H0]=d.frame,[lx,ly,lw,lh]=d.logo,k=L.h/lh,places=new Map();
 d.figures.forEach((f,order)=>{
  const sx=stretch(f.cx,lx,lw,W0,L.x,L.w,W),sy=stretch(f.cy,ly,lh,H0,L.y,L.h,H);
  const s=clamp(Math.sqrt(Math.max(sx,.01)*Math.max(sy,.01)),k*.8,k*1.3);
  places.set(f.id,{id:f.id,order,cx:slice(f.cx,lx,lw,W0,L.x,L.w,W,s),cy:slice(f.cy,ly,lh,H0,L.y,L.h,H,s),w:f.w*s,h:f.h*s,rot:f.rot,flip:f.flip});
 });
 return {mode,places,count:d.figures.length};
}

// Arrival: each puppet floats in along a gentle arc from beyond the screen edge on its side of the wordmark, turning and
// growing a little, slows down and settles with a barely visible overshoot; the back of the photo arrives first.
// Afterwards it only sways around the middle of its lower edge.
const easeOutBack=t=>{const c=.5;return 1+(c+1)*Math.pow(t-1,3)+c*Math.pow(t-1,2);};
export const FLIGHT={start:.2,step:.12,duration:2.1};
export function flightPose(place,time,{width:W,height:H,centre}){
 const {order,cx,cy,rot}=place,t=clamp((time-FLIGHT.start-order*FLIGHT.step)/FLIGHT.duration),e=easeOutBack(t);
 let dx=cx-centre.x,dy=cy-centre.y;const len=Math.hypot(dx,dy)||1;dx/=len;dy/=len;
 const far=Math.hypot(W,H)*.6,side=order%2?1:-1;
 const sx=cx+dx*far,sy=cy+dy*far,mx=(sx+cx)/2-dy*side*far*.3,my=(sy+cy)/2+dx*side*far*.3;
 const u=1-e,x=u*u*sx+2*u*e*mx+e*e*cx,y=u*u*sy+2*u*e*my+e*e*cy;
 const spin=side*(.18+(order*37%10)/40),landed=clamp((time-FLIGHT.start-order*FLIGHT.step-FLIGHT.duration)/.8),phase=order*1.7;
 const sway=landed*.014*(Math.sin(time*.7+phase)*.75+Math.sin(time*.31+phase*1.3)*.25);
 return {x,y,angle:rot*Math.PI/180+spin*(1-e),sway,scale:.86+.14*e,alpha:clamp(t*4),landed:t>=1};
}

// The shader turns a quad around its centre; this keeps the anchor (here the bottom centre) in place while the puppet sways.
// anchorU/anchorV: where the anchor is inside the picture (shares of its width and height).
export function pivotAtFeet(x,y,width,height,angle,anchorU=.5,anchorV=1){
 const fx=(anchorU-.5)*width,fy=(anchorV-.5)*height,c=Math.cos(angle),s=Math.sin(angle);
 return {x:x-(c*fx-s*fy),y:y-(s*fx+c*fy),w:width,h:height};
}
