export function readerAtEnd(top,height,total){return total-height-top<=6;}
export function finalSections(data){
 const paragraphs=data.final.replace(/\n\s*Кнопка:[\s\S]*$/,'').split(/\n\s*\n/).map(p=>p.trim()).filter(Boolean),author=paragraphs.findIndex(p=>p.startsWith(data.finalSpeaker.name));
 const editorial=paragraphs.findIndex((p,i)=>i>author&&p.startsWith('По исследованию'));
 return {intro:paragraphs.slice(0,author),comment:paragraphs.slice(author+1,editorial<0?undefined:editorial),ending:editorial<0?[]:paragraphs.slice(editorial),programme:data.eras[4].show.split(/\n\s*\n/).map(p=>p.trim()).filter(Boolean)};
}

// These dimensions stay in world units across the complete walk. Advancing the
// camera cannot change a door's physical width, wallpaper scale or floor joints.
export function corridorVolume(width,height,maxTravel){return {width,height,focal:width<=600?850:1000,halfWidth:480,halfHeight:390,far:maxTravel+4500};}
export function smoothCamera(current,target,elapsed){return current+(target-current)*(1-Math.exp(-Math.min(elapsed,48)/180));}
