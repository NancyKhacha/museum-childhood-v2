// A shared, continuous falling field: a different wind phase for every puppet.
// Archival and modern puppets alternate, so sizes and fall times cycle by index;
// phones keep the first thirteen to leave the wordmark readable.
export function puppetPose(index,time,width,height){
 if(width<=600&&index>12)return null;
 const variant=index%3,duration=23+variant*3,age=time-index*.65;
 if(age<0)return null;
 const cycle=Math.floor(age/duration),progress=(age%duration)/duration;
 const phase=index*2.399963+cycle*.9;
 const size=(width<=600?124:206)*(1-variant*.07);
 const spawn=(index*.61803398875+cycle*.27)%1;
 const wind=Math.sin(progress*Math.PI*2.8+phase)*width*(width<=600?.075:.085)+Math.sin(time*.19+phase)*width*.025;
 let x=width*(.06+.88*spawn)+wind;
 x=Math.max(size*.18,Math.min(width-size*.18,x));
 return {x,y:-size*.65+progress*(height+size*1.4),height:size,angle:Math.sin(time*.27+phase)*.34+Math.sin(time*.13+phase)*.12,progress,cycle};
}
