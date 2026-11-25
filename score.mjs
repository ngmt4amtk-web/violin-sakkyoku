import {GLYPHS} from './glyphs.mjs';
import {midi} from './music.mjs';
const mod=n=>(n%12+12)%12;
const colors={G:'#1F5FD1',D:'#EE8A00',A:'#CC1030',E:'#138A3A'};
const keys={0:[0,''],7:[1,'#'],2:[2,'#'],9:[3,'#'],4:[4,'#'],11:[5,'#'],6:[6,'#'],5:[1,'b'],10:[2,'b'],3:[3,'b'],8:[4,'b'],1:[5,'b']};
const naturals=[0,2,4,5,7,9,11], letters=['C','D','E','F','G','A','B'];
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
function spell(m,signature,kind){
 for(let i=0;i<7;i++){let a=signature[letters[i]]||0;if(mod(naturals[i]+a)===mod(m))return {i,oct:Math.floor((m-naturals[i]-a)/12)-1,a};}
 for(let i=0;i<7;i++){if(naturals[i]===mod(m))return {i,oct:Math.floor(m/12)-1,a:0};}
 for(let i=0;i<7;i++){let a=kind==='b'?-1:1;if(mod(naturals[i]+a)===mod(m))return {i,oct:Math.floor((m-naturals[i]-a)/12)-1,a};}
}
export function renderScore(melody,shapes,string,chordNames,key,tempo=90, width=800){
 const [count,kind]=keys[mod(key.root+(key.type==='major'?0:3))];
 const order=kind==='b'?['B','E','A','D','G']:['F','C','G','D','A','E'];
 const sig=Object.fromEntries(order.slice(0,count).map(l=>[l,kind==='b'?-1:1]));
 const bars=Math.ceil(melody.length/4), perSystem=width<600?2:4, systems=Math.ceil(bars/perSystem), W=width<600?370:800, H=105+(systems-1)*205+85, out=[];
 const add=s=>out.push(s), line=(x1,y1,x2,y2,extra='')=>add(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" ${extra}/>`);
 const glyph=(name,x,y,cls="")=>add(`<path class="${cls}" d="${GLYPHS[name].d}" transform="translate(${x},${y}) scale(10)"/>`);
 const text=(x,y,t,cls='',extra='')=>add(`<text x="${x}" y="${y}" class="${cls}" ${extra}>${escape(t)}</text>`);
 add(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="指番号付きの楽譜"><style>text{font-family:serif;fill:#242124}.staff{stroke:#333;stroke-width:1}.finger{font: bold 20px sans-serif}.hint{font: 9px sans-serif}.chord{font: 15px sans-serif;fill:#777}.notehead{fill:#242124}.playing .notehead{fill:var(--accent);filter:drop-shadow(0 0 5px var(--accent))}</style>`);
 text(25,25,'弦からつくる、小さな曲','', 'font-size="16"');text(25,48,`♩=${tempo}`,'','font-size="15"');
 let events=[];
 for(let i=0;i<melody.length;){let c=melody[i];if(c&&typeof c==='object'){let end=i+1;while(end<melody.length&&melody[end]==='ー')end++;for(let p=i;p<end;){let len=Math.min(end-p,4-p%4);events.push({start:p,len,cell:c,continuation:p!==i,owner:i});p+=len}i=end;}else{let end=i+1;while(end<melody.length&&Math.floor(end/4)===Math.floor(i/4)&&(!melody[end]||melody[end]==='休'||melody[end]==='ー'))end++;let p=i;while(p<end){let remain=end-p,len= p%4===0&&remain===4?4:p%2===0&&remain>=2?2:1;events.push({start:p,len,rest:true});p+=len}i=end;}}
 for(let s=0;s<systems;s++){
  const top=105+s*205, base=top+40, start=s*perSystem, n=Math.min(perSystem,bars-start), right=W-15;
  for(let j=0;j<5;j++)line(20,top+j*10,right,top+j*10,'class="staff"');
  glyph('gClef',24,top+30,'clef');
  const sy=kind==='b'?[20,5,25,10,30]:[0,15,-5,10,25,5];
  for(let k=0;k<count;k++)glyph(kind==='b'?'flat':'sharp',56+k*9,top+sy[k],'key-signature');
  if(s===0){glyph('time4',66+count*9,top+10,'time');glyph('time4',66+count*9,top+30,'time');}
  const x0=s===0?Math.max(130,90+count*9):Math.max(112,65+count*9);const barw=(right-x0)/n;
  for(let b=0;b<n;b++){let x=x0+b*barw;let ch=chordNames[start+b];text(x+5,top-48,typeof ch==='string'?ch:ch?.name||'','chord');if(b)line(x,top,x,base,'class="staff"');}
  let accidental={}; let prevBar=-1;const visible=events.filter(e=>Math.floor(e.start/(perSystem*4))===s), positioned=[];
  for(const e of visible){let b=Math.floor(e.start/4), beat=e.start%4,x=x0+(b-start)*barw+22+beat*(barw-30)/4;if(b!==prevBar){accidental={};prevBar=b;}
   if(e.rest){let name=e.len===4?'restWhole':e.len===2?'restHalf':'restQuarter';let ry=e.len===4?top+10:e.len===2?top+20:top+20;glyph(name,x-GLYPHS[name].adv*5,ry,`rest ${e.len===4?'whole-rest':e.len===2?'half-rest':'quarter-rest'}`);continue;}
   let pitch=spell(midi(e.cell.string,e.cell.finger,shapes),sig,kind),di=pitch.oct*7+pitch.i, y=base-(di-(4*7+2))*5, up=di<4*7+6, acKey=`${pitch.i}:${pitch.oct}`, current=accidental[acKey]??(sig[letters[pitch.i]]||0);
   if(pitch.a!==current){glyph(pitch.a===0?'natural':pitch.a===1?'sharp':'flat',x-19,y,'accidental');accidental[acKey]=pitch.a;}
   for(let ly=base+10;ly<=y;ly+=10)line(x-10,ly,x+10,ly,'class="staff"');for(let ly=top-10;ly>=y;ly-=10)line(x-10,ly,x+10,ly,'class="staff"');
   add(`<g class="score-note" data-start="${e.start}" data-end="${e.start+e.len}" data-owner="${e.owner}" style="--accent:${colors[e.cell.string]}">`);
   add(`<ellipse class="notehead" cx="${x}" cy="${y}" rx="7" ry="5" transform="rotate(-16 ${x} ${y})" ${e.len>=2?'style="fill:white;stroke:#242124;stroke-width:2"':''}/>`);
   if(e.len<4)line(x+(up?6:-6),y,x+(up?6:-6),y+(up?-35:35),'stroke="#242124" stroke-width="1.5"');if(e.len===3)add(`<circle cx="${x+12}" cy="${y-2}" r="2"/>`);
   let fy=Math.min(top-8,y-(up?42:10));if(!e.continuation){text(x,fy,String(e.cell.finger),'finger',`text-anchor="middle" style="fill:${colors[e.cell.string]}"`);if(e.cell.finger===1&&shapes[e.cell.string][0]===1)text(x,fy-12,'ひくく','hint','text-anchor="middle"');}
   add('</g>');positioned.push({...e,x,y,fy,up});
  }
  let hintRows=[];
  for(let i=1;i<positioned.length;i++){let a=positioned[i-1],b=positioned[i];if(a.owner===b.owner){let above=!a.up && a.fy < Math.min(a.y,b.y)-25;let dir=above?-1:1, yy=(above?Math.min(a.y,b.y):Math.max(a.y,b.y))+dir*9;add(`<path class="tie" d="M ${a.x+6} ${yy} Q ${(a.x+b.x)/2} ${yy+dir*12} ${b.x-6} ${yy}" fill="none" stroke="#333" stroke-width="1.5"/>`);}else if(!b.continuation&&a.start+a.len===b.start&&a.cell.string===b.cell.string){let f=a.cell.finger,g=b.cell.finger,lo=Math.min(f,g),shape=shapes[a.cell.string];if(lo>=1&&Math.abs(f-g)===1&&shape[lo]-shape[lo-1]===1){let hx=(a.x+b.x)/2,hy=Math.min(a.fy,b.fy)-25;while(hintRows.some(h=>Math.abs(h.x-hx)<42&&Math.abs(h.y-hy)<11))hy-=11;hintRows.push({x:hx,y:hy});text(hx,hy,'くっつく','hint','text-anchor="middle"')};}}
  if(positioned.length){let first=positioned[0],last=positioned[positioned.length-1];if(first.continuation&&first.start%(perSystem*4)===0)add(`<path class="tie" d="M ${x0} ${first.y+11} Q ${(x0+first.x)/2} ${first.y+22} ${first.x-6} ${first.y+11}" fill="none" stroke="#333"/>`);if(events.some(e=>e.owner===last.owner&&e.start===last.start+last.len)&&last.start+last.len===(s+1)*perSystem*4)add(`<path class="tie" d="M ${last.x+6} ${last.y+11} Q ${(last.x+right)/2} ${last.y+22} ${right} ${last.y+11}" fill="none" stroke="#333"/>`);}
  line(right,top,right,base,'class="staff"');if(s===systems-1)line(right-5,top,right-5,base,'stroke="#333" stroke-width="3"');
 }
 add('</svg>');return out.join('');
}
