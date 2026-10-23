import {puppetPose} from './hero-math.js?v=20261023-v2n';
// One autonomous material treatment for the wordmark, clouds and whole puppets.
// Puppets fall continuously with independent wind and rotation, as in the reference.
const hero=document.querySelector('.hero'),logo=document.querySelector('.morph-logo'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
const vertex=`attribute vec2 aPosition;uniform vec4 uRect;uniform vec2 uViewport;uniform float uAngle,uPhase,uTime,uMaterial,uSky;varying vec2 vUV;void main(){vUV=vec2(aPosition.x*.5+.5,.5-aPosition.y*.5);float angle=uAngle+sin(uTime*.32+uPhase)*.008*uMaterial*(1.-uSky);vec2 local=aPosition*uRect.zw*.5;local=mat2(cos(angle),sin(angle),-sin(angle),cos(angle))*local;vec2 center=vec2(uRect.x/uViewport.x*2.-1.,1.-uRect.y/uViewport.y*2.);vec2 offset=vec2(local.x/uViewport.x*2.,-local.y/uViewport.y*2.);float w=1.+aPosition.x*sin(uTime*.24+uPhase)*.018*uMaterial*(1.-uSky);gl_Position=vec4(center*w+offset,0.,w);}`;
const fragment=`precision highp float;uniform sampler2D uImage;uniform vec2 uTexel;uniform vec4 uUVRect;uniform float uTime,uPhase,uMaterial,uOpacity,uSky,uBlur;varying vec2 vUV;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.)),f.x),f.y);}
float fbm(vec2 p){float f=0.,a=.5;for(int i=0;i<5;i++){f+=a*noise(p);p=mat2(1.6,-1.2,1.2,1.6)*p;a*=.5;}return f;}
vec4 sampleAsset(vec2 uv){return texture2D(uImage,uUVRect.xy+clamp(uv,.002,.998)*uUVRect.zw);}float relief(vec2 uv){vec4 c=sampleAsset(uv);return dot(c.rgb,vec3(.299,.587,.114))*c.a;}void main(){if(uSky>.5){
float aspect=max(uMaterial,.3);vec2 p=vec2(vUV.x*aspect,vUV.y+uPhase);float t=uTime*.01;
// Cirrus: thin fibres stretched along a shallow diagonal, gathered into drifting patches,
// over a softer veil; a light clearing keeps the wordmark legible.
vec2 s=mat2(.94,-.34,.34,.94)*p;
float patches=smoothstep(.28,.60,fbm(s*vec2(1.2,2.4)+vec2(t,1.7)));
float fibre=smoothstep(.40,.80,fbm(s*vec2(2.,15.)+vec2(t*2.,0.)+fbm(s*3.2)*.9));
float veil=smoothstep(.42,.82,fbm(s*vec2(.8,4.6)-vec2(t*.6,0.)+3.1));
float cloud=clamp(patches*(fibre+veil*.45),0.,1.);
vec2 d=(vUV-vec2(.5,.42))*vec2(2.4,3.);float clearing=1.-.45*exp(-dot(d,d));
float lens=exp(-length((vUV-vec2(.82+sin(t)*.05,.78))*vec2(1.8,1.0))*3.);
vec3 blue=vec3(0.,.4667,1.);vec3 color=mix(blue,vec3(.86,.95,1.),clamp((cloud*clearing*.9+lens*.14)*uOpacity,0.,.82));
gl_FragColor=vec4(color,1.);return;}
vec2 uv=vUV+vec2(sin(vUV.y*7.+uTime*.6+uPhase),cos(vUV.x*6.-uTime*.5+uPhase))*.0022*uMaterial;vec4 c=sampleAsset(uv);
// Far puppets are softly out of focus: a small spiral of taps around the sample.
if(uBlur>.01){vec4 sum=c;for(int k=0;k<14;k++){float a=float(k)*2.39996,rr=sqrt((float(k)+.5)/14.);sum+=sampleAsset(uv+vec2(cos(a),sin(a))*rr*uTexel*uBlur);}c=sum/15.;}
if(c.a<.005)discard;float dx=relief(uv-vec2(uTexel.x*2.,0.))-relief(uv+vec2(uTexel.x*2.,0.));float dy=relief(uv-vec2(0.,uTexel.y*2.))-relief(uv+vec2(0.,uTexel.y*2.));vec3 normal=normalize(vec3(dx*3.,dy*3.,1.));vec3 light=normalize(vec3(sin(uTime*.16+uPhase)*.6,.35,1.5));float spec=pow(max(dot(normal,normalize(light+vec3(0.,0.,1.))),0.),40.);vec3 color=c.rgb*(1.-.018*uMaterial)+vec3(.025,.033,.042)*spec*uMaterial;float alpha=c.a*uOpacity;gl_FragColor=vec4(color*alpha,alpha);}`;
class GelCanvas{
 constructor(canvas){this.canvas=canvas;const gl=this.gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:true,powerPreference:'low-power'});if(!gl)throw Error('WebGL unavailable');const shader=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error('Material shader');return s;};const program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Material program');gl.useProgram(program);const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);const a=gl.getAttribLocation(program,'aPosition');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);this.u={};for(const key of ['Rect','Viewport','Angle','Phase','Time','Material','Opacity','Image','Texel','Sky','UVRect','Blur'])this.u[key]=gl.getUniformLocation(program,'u'+key);gl.uniform1i(this.u.Image,0);gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);}
 texture(image){const gl=this.gl,t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);return {texture:t,image};}
 resize(w,h){this.width=w;this.height=h;const dpr=Math.min(devicePixelRatio||1,1.5),cw=Math.round(w*dpr),ch=Math.round(h*dpr);if(this.canvas.width!==cw||this.canvas.height!==ch){this.canvas.width=cw;this.canvas.height=ch;this.gl.viewport(0,0,cw,ch);}this.gl.uniform2f(this.u.Viewport,w,h);}
 clear(){const gl=this.gl;gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);}
 draw(asset,rect,{angle=0,phase=0,time=0,material=.2,opacity=1,sky=0,blur=0,uvRect=[0,0,1,1]}={}){const gl=this.gl;gl.bindTexture(gl.TEXTURE_2D,asset.texture);gl.uniform2f(this.u.Texel,1/asset.image.naturalWidth,1/asset.image.naturalHeight);gl.uniform4f(this.u.Rect,rect.x,rect.y,rect.w,rect.h);gl.uniform1f(this.u.Angle,angle);gl.uniform1f(this.u.Phase,phase);gl.uniform1f(this.u.Time,time);gl.uniform1f(this.u.Material,material);gl.uniform1f(this.u.Opacity,opacity);gl.uniform1f(this.u.Sky,sky);gl.uniform1f(this.u.Blur,blur);gl.uniform4fv(this.u.UVRect,uvRect);gl.drawArrays(gl.TRIANGLES,0,6);}
}
const ready=image=>image.complete&&image.naturalWidth?Promise.resolve():new Promise((resolve,reject)=>{image.addEventListener('load',resolve,{once:true});image.addEventListener('error',reject,{once:true});});
function contained(image,box,origin={left:0,top:0}){const ratio=image.naturalWidth/image.naturalHeight,w=Math.min(box.width,box.height*ratio),h=w/ratio;return{x:box.left-origin.left+box.width/2,y:box.top-origin.top+box.height/2,w,h};}
if(hero&&logo&&!reduced.matches){
 const sceneCanvas=document.createElement('canvas'),logoCanvas=document.createElement('canvas');sceneCanvas.className='hero-scene';sceneCanvas.setAttribute('aria-hidden','true');sceneCanvas.dataset.effect='whole-scene-gel';logoCanvas.setAttribute('aria-hidden','true');document.body.prepend(sceneCanvas);logo.append(logoCanvas);
 let scene,wordmark;
 try{scene=new GelCanvas(sceneCanvas);wordmark=new GelCanvas(logoCanvas);hero.classList.add('scene-active');}catch{sceneCanvas.remove();logoCanvas.remove();}
 if(scene&&wordmark){
  const logoImage=logo.querySelector('img'),cloudElements=[...hero.querySelectorAll('.cloud')],headElements=[...hero.querySelectorAll('.falling')];let frame=0,started=0,loaded=false,logoAsset=null;const clouds=[],heads=headElements.map(()=>null);
  // The sky needs no picture and starts at once; the wordmark and every puppet join as soon as their own image arrives.
  const blank=document.createElement('canvas');blank.width=blank.height=1;const skyAsset={...scene.texture(blank),image:{naturalWidth:1,naturalHeight:1}};
  function draw(now){frame=0;if(!loaded||document.hidden||reduced.matches)return;const time=(now-started)/1000,h=hero.getBoundingClientRect(),visible=h.bottom>0;
   if(logoAsset){wordmark.resize(690,345);wordmark.clear();wordmark.draw(logoAsset,{x:345,y:172.5,w:690,h:345},{time,material:.8});}
   // The sky stays fixed behind the whole page. Past the cover it is redrawn only on scroll, with thinner clouds behind the text.
   const sw=sceneCanvas.clientWidth||innerWidth,sh=sceneCanvas.clientHeight||innerHeight,leave=clamp(-h.top/h.height);
   scene.resize(sw,sh);scene.clear();scene.draw(skyAsset,{x:sw/2,y:sh/2,w:sw,h:sh},{time,material:sw/sh,sky:1,phase:scrollY/sh*.3,opacity:1-.45*leave});
   if(visible){for(const [i,c]of clouds.entries()){const r=contained(c.asset.image,c.el.getBoundingClientRect());r.y+=Math.sin(time*.25+i)*4;scene.draw(c.asset,r,{time,phase:i*1.7,material:.75});}
    let entered=0;
    // Smaller (farther) puppets are drawn first so the near ones pass in front of them.
    // A puppet that arrives late starts its route from the beginning, so it flies in rather than popping up mid-sky.
    const poses=heads.map((b,i)=>b&&{b,i,pose:puppetPose(i,time-b.delay,h.width,h.height)}).filter(p=>p&&p.pose).sort((p,q)=>p.pose.height-q.pose.height);entered=poses.length;
    for(const {b,i,pose}of poses){
     const cells=b.el.hasAttribute('data-cell')?2:1,cell=Number(b.el.dataset.cell)||0,aspect=b.asset.image.naturalWidth/cells/b.asset.image.naturalHeight;
     scene.draw(b.asset,{x:pose.x+h.left,y:pose.y+h.top,w:pose.height*aspect,h:pose.height},{time,phase:i*.9,angle:pose.angle,material:.18,opacity:(1-.5*leave)*pose.alpha,blur:pose.blur*b.asset.image.naturalHeight/pose.height,uvRect:[cell/cells,0,1/cells,1]});
    }
    hero.dataset.enteredHeads=String(entered);
    frame=requestAnimationFrame(draw);
   }
  }
  const wake=()=>{if(loaded&&!frame&&!reduced.matches)frame=requestAnimationFrame(draw);};
  started=performance.now();loaded=true;hero.dataset.renderer='webgl';hero.dataset.sequence='continuous-wind';wake();
  // Until its image is decoded the wordmark stays the plain <img>; a broken image simply keeps that fallback.
  ready(logoImage).then(()=>{logoAsset=wordmark.texture(logoImage);if(!reduced.matches)logo.classList.add('gl-active');logo.dataset.renderer='webgl';wake();}).catch(()=>logoCanvas.remove());
  for(const el of cloudElements){const img=el.querySelector('img');ready(img).then(()=>clouds.push({el,asset:scene.texture(img)})).catch(()=>{});}
  headElements.forEach((el,i)=>{const img=el.querySelector('img');ready(img).then(()=>{heads[i]={el,asset:scene.texture(img),delay:Math.max(0,(performance.now()-started)/1000-i*.65)};}).catch(()=>{});});
  addEventListener('scroll',wake,{passive:true});addEventListener('resize',wake);document.addEventListener('visibilitychange',wake);reduced.addEventListener('change',()=>{hero.classList.toggle('scene-active',!reduced.matches);logo.classList.toggle('gl-active',!reduced.matches&&!!logoAsset);if(reduced.matches){cancelAnimationFrame(frame);frame=0;}else wake();});for(const canvas of [sceneCanvas,logoCanvas])canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();loaded=false;hero.classList.remove('scene-active');logo.classList.remove('gl-active');});
 }
}
