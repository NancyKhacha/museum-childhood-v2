// The approved corridor illustration is the only picture on screen. At rest the
// canvas matches it pixel for pixel; walking forward re-projects the same image
// with the depth of its own perspective: near walls stream past, the far end
// barely moves. Nothing is cut out, repainted, tiled or added.
const vertex=`attribute vec2 aPosition;varying vec2 vUV;void main(){vUV=vec2(aPosition.x*.5+.5,.5-aPosition.y*.5);gl_Position=vec4(aPosition,0.,1.);}`;
const fragment=`precision highp float;varying vec2 vUV;
uniform sampler2D uImage;uniform vec4 uCover,uSection,uFront;uniform vec2 uVanish;uniform float uWalk,uFar,uFrontDepth,uSoft;
// Depth is the inverse of how far a point sits from the vanishing point, measured
// against one cross-section of the corridor (u = 1 on that rectangle).
float depthIndex(vec2 p){return max(max(-p.x/uSection.x,p.x/uSection.z),max(-p.y/uSection.y,p.y/uSection.w));}
bool behindFront(vec2 p){return -p.x/uSection.x>uFront.x||-p.y/uSection.y>uFront.y||p.x/uSection.z>uFront.z||p.y/uSection.w>uFront.w;}
// Furniture is painted, not modelled, so depth is softened (uSoft < 1): sideboards
// and lamps grow as you pass instead of smearing along the wall plane.
float nearness(float u){return pow(max(u,1e-4),uSoft);}
void main(){
 vec2 p=uCover.xy+vUV*uCover.zw-uVanish,source;
 vec2 front=p*(1.-uWalk*nearness(uFrontDepth));
 if(uFrontDepth>0.&&uWalk*nearness(uFrontDepth)<1.&&behindFront(front))source=front;
 else{
  // Solve s = p*k with k = 1 - walk*nearness(k*u(p)); monotonic, three Newton steps.
  float u=depthIndex(p),k=1./(1.+uWalk*nearness(u));
  for(int i=0;i<3;i++){float f=k+uWalk*nearness(k*u)-1.,df=1.+uWalk*uSoft*nearness(k*u)/max(k,1e-4);k=clamp(k-f/df,.05,1.);}
  if(k*u<uFar)k=1.-uWalk*nearness(uFar);
  source=p*k;
 }
 gl_FragColor=vec4(texture2D(uImage,uVanish+source).rgb,1.);
}`;
const SOFT=.6;
const OPEN=1e6;
export class CorridorScene{
 constructor(canvas,image){
  this.canvas=canvas;this.image=image;this.progress=0;this.walk=0;canvas.hidden=true;
  try{
   const options={alpha:false,antialias:false,powerPreference:'low-power'};
   const gl=this.gl=canvas.getContext('webgl2',options)||canvas.getContext('webgl',options);if(!gl)return;
   this.mips=typeof WebGL2RenderingContext!=='undefined'&&gl instanceof WebGL2RenderingContext;
   const shader=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};
   const program=this.program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Corridor shader');gl.useProgram(program);
   gl.bindBuffer(gl.ARRAY_BUFFER,gl.createBuffer());gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);const a=gl.getAttribLocation(program,'aPosition');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);
   this.u={};for(const key of ['Image','Cover','Section','Front','Vanish','Walk','Far','FrontDepth','Soft'])this.u[key]=gl.getUniformLocation(program,'u'+key);
   canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.gl=null;canvas.hidden=true;image.style.visibility='';});
  }catch{this.gl=null;}
 }
 texture(image){
  const gl=this.gl,t=gl.createTexture();let source=image;
  // WebGL1 cannot mipmap non-power-of-two images; resample once for that path only.
  if(!this.mips){source=document.createElement('canvas');source.width=2048;source.height=1024;source.getContext('2d').drawImage(image,0,0,2048,1024);}
  gl.bindTexture(gl.TEXTURE_2D,t);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,source);gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  const ext=gl.getExtension('EXT_texture_filter_anisotropic');if(ext)gl.texParameterf(gl.TEXTURE_2D,ext.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(8,gl.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
  return t;
 }
 async setImage(image){
  if(!this.gl||!image.naturalWidth)return;
  if(this.back)this.gl.deleteTexture(this.back);this.back=this.texture(image);
  this.canvas.hidden=false;this.image.style.visibility='hidden';this.canvas.dataset.renderer='approved-corridor';
 }
 // profile: vanishing point, one cross-section, the depth of the far end and
 // the opening of a near front wall, all in fractions of the illustration.
 resize(profile){
  if(!profile)return;this.profile=profile;
  const [vx,vy]=profile.vanishing,[l,t,r,b]=profile.section;this.section=[vx-l,vy-t,r-vx,b-vy];
  const front=profile.front,s=this.section;this.frontDepth=front?Math.max(...front.map((edge,i)=>edge==null?0:[(vx-edge)/s[0],(vy-edge)/s[1],(edge-vx)/s[2],(edge-vy)/s[3]][i])):0;
  this.front=front?front.map(edge=>edge==null?OPEN:this.frontDepth):[OPEN,OPEN,OPEN,OPEN];
  const box=this.canvas.getBoundingClientRect();if(!box.width||!box.height)return;
  if(this.gl){const dpr=Math.min(devicePixelRatio||1,2);this.canvas.width=Math.round(box.width*dpr);this.canvas.height=Math.round(box.height*dpr);this.gl.viewport(0,0,this.canvas.width,this.canvas.height);}
  // Same placement as the <img> fallback: object-fit cover, object-position at the vanishing point.
  const iw=this.image.naturalWidth||16,ih=this.image.naturalHeight||9,scale=Math.max(box.width/iw,box.height/ih),offX=(box.width-iw*scale)*vx,offY=(box.height-ih*scale)*vy;
  this.cover=[-offX/scale/iw,-offY/scale/ih,box.width/scale/iw,box.height/scale/ih];
  this.image.style.objectPosition=`${vx*100}% ${vy*100}%`;
  this.walk=this.maxWalk();this.draw(this.progress);
 }
 // How far the visitor can step in before the closest surface on screen is
 // magnified past the illustration's own detail.
 maxWalk(limit=1.6){
  const [cx,cy,cw,ch]=this.cover,[vx,vy]=this.profile.vanishing,[l,t,r,b]=this.section;let edge=0;
  for(const x of [cx,cx+cw])for(const y of [cy,cy+ch]){const dx=x-vx,dy=y-vy;edge=Math.max(edge,Math.min(Math.max(-dx/l,dx/r,-dy/t,dy/b),this.frontDepth||OPEN));}
  // The screen edge shows content magnified by 1/k, where k = 1 - walk*(k*edge)^SOFT.
  let walk=(1-1/limit)/(edge/limit)**SOFT;if(this.frontDepth)walk=Math.min(walk,(1-1/limit)/this.frontDepth**SOFT);
  return matchMedia('(prefers-reduced-motion: reduce)').matches?walk*.25:walk;
 }
 draw(progress){
  this.progress=progress;const gl=this.gl;if(!gl||!this.back||!this.cover)return;gl.useProgram(this.program);
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.back);gl.uniform1i(this.u.Image,0);
  gl.uniform4fv(this.u.Cover,this.cover);gl.uniform4fv(this.u.Section,this.section);gl.uniform4fv(this.u.Front,this.front);gl.uniform2fv(this.u.Vanish,this.profile.vanishing);
  gl.uniform1f(this.u.Far,1/(this.profile.far||3));gl.uniform1f(this.u.FrontDepth,this.frontDepth);gl.uniform1f(this.u.Soft,SOFT);gl.uniform1f(this.u.Walk,this.walk*progress);
  gl.drawArrays(gl.TRIANGLES,0,6);this.canvas.dataset.walk=(this.walk*progress).toFixed(4);
 }
}
