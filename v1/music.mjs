export const STRINGS={G:55,D:62,A:69,E:76};
export const PRESETS={'23':[2,4,5,7],'12':[2,3,5,7],'34':[2,4,6,7]};
const mod=n=>(n%12+12)%12;
const scales={major:[0,2,4,5,7,9,11],minor:[0,2,3,5,7,8,10],harmonic:[0,2,3,5,7,8,11]};
const sharp=['ド','ド♯','レ','レ♯','ミ','ファ','ファ♯','ソ','ソ♯','ラ','ラ♯','シ'];
const flat=['ド','レ♭','レ','ミ♭','ミ','ファ','ソ♭','ソ','ラ♭','ラ','シ♭','シ'];
const english=['C','C♯','D','E♭','E','F','F♯','G','A♭','A','B♭','B'];
export function midi(string,finger,shapes){return STRINGS[string]+(finger?shapes[string][finger-1]:0)}
export function findKeys(string,shape){const pcs=[0,...shape].map(n=>mod(STRINGS[string]+n)); let all=[]; for(let root=0;root<12;root++) for(const [type,intervals] of Object.entries(scales)){const contained=pcs.filter(p=>intervals.includes(mod(p-root))).length; all.push({root,type,contained});} const max=Math.max(...all.map(k=>k.contained)); const eligible=all.filter(k=>k.contained===(max===5?5:max)); return pcs.flatMap((pc,finger)=>{const matches=eligible.filter(k=>k.root===pc).sort((a,b)=>['major','minor','harmonic'].indexOf(a.type)-['major','minor','harmonic'].indexOf(b.type)); return matches.length?[{finger,...matches[0],fallback:max<5}]:[]});}
export function resolveKey(string,shape,finger){const keys=findKeys(string,shape); if(keys.length)return keys.find(k=>k.finger===finger)||keys[0]; const pcs=[0,...shape].map(n=>mod(STRINGS[string]+n)); let best; for(let root=0;root<12;root++)for(const [type,s] of Object.entries(scales)){const contained=pcs.filter(p=>s.includes(mod(p-root))).length;if(!best||contained>best.contained)best={root,type,contained,fallback:true,finger:0};}return best;}
export function noteName(m,key){const flats=[1,3,5,8,10].includes(key?.root);return (flats?flat:sharp)[mod(m)];}
function chord(root,quality,degree){let intervals=quality==='m'?[0,3,7]:quality==='7'?[0,4,7,10]:quality==='maj7'?[0,4,7,11]:quality==='m7'?[0,3,7,10]:[0,4,7];return {root:mod(root),quality,degree,pcs:intervals.map(x=>mod(root+x)),name:english[mod(root)]+quality};}
export function chords(key){let r=key.root;if(key.type==='major')return [chord(r,'','I'),chord(r+2,'m','ii'),chord(r+4,'m','iii'),chord(r+5,'','IV'),chord(r+7,'','V'),chord(r+9,'m','vi')];return [chord(r,'m','i'),chord(r+5,'m','iv'),chord(r+7,'','V'),chord(r+8,'','VI'),chord(r+3,'','III'),chord(r+10,'','VII')];}
export const PROGRESSIONS={'王道進行':['IV','V','iii','vi'],'カノン進行':['I','V','vi','iii','IV','I','IV','V'],'小室進行':['vi','IV','V','I'],'イチロクニーゴー':['I','vi','ii','V'],'基本':['I','IV','V','I'],'丸の内':['IVmaj7','III7','vi7','I']};
export function progression(key,name,bars){const root=mod(key.root+(key.type==='major'?0:3));const defs={I:[0,''],ii:[2,'m'],iii:[4,'m'],IV:[5,''],V:[7,''],vi:[9,'m'],IVmaj7:[5,'maj7'],III7:[4,'7'],vi7:[9,'m7']};let seq=PROGRESSIONS[name]||PROGRESSIONS['基本'];if(name==='ランダム')seq=Array.from({length:bars},()=>['I','ii','iii','IV','V','vi'][Math.floor(Math.random()*6)]);return Array.from({length:bars},(_,i)=>{let d=seq[i%seq.length], [offset,q]=defs[d];return chord(root+offset,q,d)});}
export function cellMidi(cell,shapes){return cell&&typeof cell==='object'?midi(cell.string,cell.finger,shapes):null;}
export function soundingNotes(cells,shapes){let last=null;return cells.map(c=>{if(c==='ー')return last;if(c==='休'||!c){last=null;return null;}last=cellMidi(c,shapes);return last;});}
export function harmonize(cells,shapes,key){const notes=soundingNotes(cells,shapes),bars=cells.length/4,cs=chords(key), tonic=cs[0],scores=[],back=[]; for(let b=0;b<bars;b++){let empty=notes.slice(b*4,b*4+4).every(n=>n===null);scores[b]=[];back[b]=[];for(let j=0;j<cs.length;j++){let local=0;for(let p=0;p<4;p++){let i=b*4+p,n=notes[i];if(n===null||cells[i]==='ー')continue;let length=1;while(i+length<cells.length&&cells[i+length]==='ー')length++;if(cs[j].pcs.includes(mod(n)))local+=length*(p===0?2:p===2?1.5:1);}if(b===bars-2&&cs[j].degree==='V')local+=5;if(b===bars-1&&j===0&&cs[j].pcs.includes(mod(notes.slice().reverse().find(n=>n!==null)??key.root)))local+=12;if(b===bars-1){const ln=notes.slice().reverse().find(n=>n!==null);if(ln!=null&&!cs[j].pcs.includes(mod(ln))&&cs.some(x=>x.pcs.includes(mod(ln))))local-=100;}if(b===0){scores[b][j]=local+(j===0?0.1:0);back[b][j]=-1;continue;}let best=-Infinity,bi=0;for(let k=0;k<cs.length;k++){if(empty&&k!==j)continue;let transition=k===j?-0.3:0;if(cs[k].degree==='V'&&j===0)transition+=2;if(['ii','IV','iv'].includes(cs[k].degree)&&cs[j].degree==='V')transition+=1.2;let value=scores[b-1][k]+transition+local;if(value>best){best=value;bi=k;}}scores[b][j]=best;back[b][j]=bi;}}let j=scores[bars-1].indexOf(Math.max(...scores[bars-1])),out=Array(bars);for(let b=bars-1;b>=0;b--){out[b]=cs[j];j=back[b][j];}if(notes.every(n=>n===null))return Array(bars).fill(tonic);return out;}
export function voice(ch,minMelody){const limit=minMelody??60;const upper=[];for(const pc of ch.pcs){let n=limit-1;while(mod(n)!==pc)n--;if(n>=limit-12)upper.push(n);}let bass=limit-13;while(mod(bass)!==ch.root)bass--;if(bass<36){bass=36;while(mod(bass)!==ch.root)bass++;if(bass>=limit)bass=limit-1;}return {upper,bass};}
export function makeMelody(string,shape,key,barChords){
  const vals=[0,...shape].map(x=>STRINGS[string]+x),T=key.finger,nb=barChords.length,out=[];
  const pick=a=>a[Math.floor(Math.random()*a.length)];
  const best=(cands,score)=>cands.map(f=>({f,s:score(f)+Math.random()*1.2})).sort((a,b)=>a.s-b.s)[0].f;
  const tonesOf=b=>[0,1,2,3,4].filter(f=>barChords[b].pcs.includes(mod(vals[f])));
  const plain=[['n','n','n','n'],['n','n','n','ー'],['n','ー','n','n'],['n','n','n','n'],['n','ー','n','ー']];
  let prev=T,run=1;
  for(let b=0;b<nb;b++){
    const tones=tonesOf(b);
    if(b===nb-1){
      const end=T;
      out.push({string,finger:end},'ー','ー','ー');break;
    }
    const pat=(b===0||b===nb-2)?pick(plain.slice(0,4)):pick(plain);
    for(let p=0;p<4;p++){
      if(pat[p]==='ー'){out.push('ー');continue;}
      const lastBeforeEnd=b===nb-2&&pat.slice(p+1).every(x=>x==='ー');
      let f;
      if(b===0&&p===0)f=tones.length?best(tones,x=>Math.abs(x-T)):T;
      else if(lastBeforeEnd){const adj=[T-1,T+1].filter(x=>x>=0&&x<=4);f=best(adj,x=>Math.abs(x-prev));}
      else if(p%2===0&&tones.length)f=best(tones,x=>{const d=Math.abs(x-prev);return (d===0?(run>=2?9:2.2):d===1?0:d===2?0.6:d*1.4);});
      else{const cands=[0,1,2,3,4].filter(x=>x!==prev||run<2);f=best(cands,x=>{const d=Math.abs(x-prev);return d===1?0:d===0?2:d===2?1.5:d*2;});}
      run=f===prev?run+1:1;prev=f;out.push({string,finger:f});
    }
  }
  return out;
}
