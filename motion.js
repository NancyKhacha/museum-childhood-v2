const reduce=matchMedia('(prefers-reduced-motion: reduce)'),hero=document.querySelector('.hero'),logo=document.querySelector('.morph-logo'),root=document.documentElement,depth=[...document.querySelectorAll('[data-depth]:not(.falling)')],parallax=[...document.querySelectorAll('[data-parallax]')];
let pending=false,displayY=scrollY,lastTime=0;
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
function render(now=performance.now()){
 pending=false;const dt=Math.min(48,now-(lastTime||now));lastTime=now;displayY=reduce.matches?scrollY:displayY+(scrollY-displayY)*(1-Math.exp(-dt/110));if(Math.abs(scrollY-displayY)<.1)displayY=scrollY;const y=displayY,w=innerWidth,h=hero.offsetHeight,mobile=w<=600,p=clamp(y/(h*.85)),e=p*p*(3-2*p),base=mobile?Math.min(350,w-40):Math.min(690,w*.60),target=mobile?104:176,width=base+(target-base)*e,x=(w-base)/2+((mobile?16:24)-(w-base)/2)*e,logoHeight=base/2,subtitle=document.querySelector('.hero-subtitle'),subtitleHeight=subtitle.offsetHeight,visualTop=logoHeight*23/700,visualBottom=logoHeight*653/700,gap=16,startY=(h-(visualBottom-visualTop+gap+subtitleHeight))/2-visualTop,top=startY+((mobile?2:4)-startY)*e;hero.style.setProperty('--subtitle-top',(startY+visualBottom+gap)+'px');
 root.style.setProperty('--hero-progress',e.toFixed(4));document.querySelector('.fixed-header').classList.toggle('is-visible',e>.1);logo.style.transform=`translate3d(${x}px,${top}px,0) scale(${width/690})`;
 const bg=p<1?`rgb(${Math.round(20*p)},${Math.round(119+10*p)},255)`:'#1481ff';document.body.style.backgroundColor=bg;
 for(const el of depth)el.style.transform=reduce.matches?'none':`translate3d(0,${-y*Number(el.dataset.depth)}px,0)`;
 for(const el of parallax){if(reduce.matches){el.style.transform='none';continue}const r=el.getBoundingClientRect();if(r.bottom>-100&&r.top<innerHeight+100){const d=clamp((r.top+r.height/2-innerHeight/2)/innerHeight,-1,1)*(mobile?10:18);el.style.transform=`translate3d(0,${d}px,0)`;}}
 if(Math.abs(scrollY-displayY)>.1)request();
}
function request(){if(!pending){pending=true;requestAnimationFrame(render)}}
addEventListener('scroll',request,{passive:true});addEventListener('resize',request);reduce.addEventListener('change',request);render();
