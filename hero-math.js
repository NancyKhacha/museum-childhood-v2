// Puppets float through the sky at different depths and along different routes,
// as in the haoqi.design reference: near ones are larger, faster and sharp; far
// ones are smaller, slower, softly out of focus and paler. Archival and modern
// puppets alternate; phones keep the first thirteen to leave the wordmark readable.
const SCALES=[1,.72,1.38,.86,1.16,.66,1.5,.8,1.08,.92,1.28,.75];
// fall: down with the wind; drift: across the screen, slowly sinking;
// rise: up from below like a balloon; arc: a slow pass along the upper sky.
const ROUTES=['fall','drift','rise','arc','fall','drift','arc','rise','drift','fall','rise','arc'];
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
export function puppetPose(index,time,width,height){
 const mobile=width<=600;if(mobile&&index>12)return null;
 const scale=SCALES[index%SCALES.length],route=ROUTES[index%ROUTES.length];
 const duration=(30-scale*8.5)*(route==='arc'?1.3:route==='drift'?1.15:1),age=time-index*.65;
 if(age<0)return null;
 const cycle=Math.floor(age/duration),progress=(age%duration)/duration;
 const phase=index*2.399963+cycle*.9,size=(mobile?118:196)*scale;
 const spawn=(index*.61803398875+cycle*.27)%1,dir=(index+cycle)%2?1:-1,span=width+size*1.6;
 const wind=Math.sin(progress*Math.PI*2.8+phase)*width*(mobile?.075:.085)+Math.sin(time*.19+phase)*width*.025;
 // Routes keep to the side lanes and to the upper and lower bands, so the wordmark and subtitle stay clear.
 const lane=width*(spawn<.5?.05+.56*spawn:.67+.56*(spawn-.5)),band=spawn<.5?.05+.36*spawn:.72+.3*(spawn-.5);
 let x,y;
 if(route==='fall'){x=clamp(lane+wind*.6,size*.18,width-size*.18);y=-size*.65+progress*(height+size*1.4);}
 else if(route==='rise'){x=clamp(lane+wind*.5,size*.18,width-size*.18);y=height+size*.65-progress*(height+size*1.4);}
 else if(route==='drift'){x=width/2+dir*(progress-.5)*span;y=height*band+Math.sin(progress*Math.PI*2+phase)*height*.04;}
 else{x=width/2-dir*(progress-.5)*span;y=height*(.08+.2*spawn)+Math.sin(progress*Math.PI)*height*.1;}
 const far=clamp((.95-scale)/.3);
 return {x,y,height:size,angle:Math.sin(time*.27+phase)*.34+Math.sin(time*.13+phase)*.12,progress,cycle,route,blur:far*2.2,alpha:1-.25*far};
}
