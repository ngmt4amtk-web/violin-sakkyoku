import assert from 'node:assert/strict';
import {STRINGS,PRESETS,midi,findKeys,resolveKey,progression,PROGRESSIONS,harmonize,voice,soundingNotes} from '../music.mjs';
const shapes=Object.fromEntries(Object.keys(STRINGS).map(s=>[s,[...PRESETS['23']]]));
assert.deepEqual([0,1,2,3,4].map(f=>midi('A',f,shapes)),[69,71,73,74,76]);
shapes.E=[1,3,5,7];assert.deepEqual([0,1,2,3,4].map(f=>midi('E',f,shapes)),[76,77,79,81,83]);
const scales=[[0,2,4,5,7,9,11],[0,2,3,5,7,8,10],[0,2,3,5,7,8,11]],pcs=[76,77,79,81,83].map(n=>n%12);let brute=pcs.map((root,finger)=>({finger,types:scales.map((s,i)=>pcs.every(p=>s.includes((p-root+12)%12))?i:null).filter(x=>x!==null)})).filter(x=>x.types.length);assert.deepEqual(findKeys('E',shapes.E).map(x=>x.finger),brute.map(x=>x.finger));console.log('E線の候補:',brute);
assert.deepEqual(findKeys('A',PRESETS['12']).map(x=>x.finger).filter(x=>x===0||x===2),[0,2]);
const c=(finger)=>({string:'A',finger}), melody=[c(0),c(1),c(2),c(3),c(4),'ー',c(2),'ー',c(3),c(3),c(1),c(1),c(0),'ー','ー','ー'];let key=resolveKey('A',shapes.A,0),result=harmonize(melody,shapes,key);assert.equal(result.length,4);assert.equal(result[3].degree,'I');assert.ok(['V','V7'].includes(result[2].degree));
for(let root=0;root<12;root++)for(const type of ['major','minor','harmonic'])for(const name of Object.keys(PROGRESSIONS))assert.ok(progression({root,type},name,8).every(c=>c.name));
shapes.G=PRESETS['23'];let low=[0,1,2,3].map(f=>({string:'G',finger:f})),min=Math.min(...soundingNotes(low,shapes));for(const ch of result){let v=voice(ch,min);assert.ok([...v.upper,v.bass].every(n=>n<min));assert.ok(v.bass>=36)}
console.log('音楽ロジックのテスト: すべて成功');
