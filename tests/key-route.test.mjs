import test from 'node:test';
import assert from 'node:assert/strict';
import {KEYS, keyShapes, keyRows, inScale, chords, progression, makeKeyMelody, cellMidi, keyScaleRows} from '../music.mjs';

const counts={C:17,G:17,D:17,A:16,F:17,Am:17,Em:17,Bm:17,Dm:17};
for(const key of KEYS){
  test(`${key.id}: scale rows and generated ending`,()=>{
    const shapes=keyShapes(key), rows=keyRows(key,shapes);
    assert.equal(rows.length,counts[key.id]);
    assert.ok(rows.every(row=>inScale(row.midi,key)&&row.midi<=83));
    assert.equal(new Set(rows.map(row=>row.midi)).size,rows.length);
    assert.ok(rows.every((row,i)=>i===0||rows[i-1].midi>row.midi));
    const scale=keyScaleRows(rows,key);
    assert.equal(scale.length,8);
    assert.equal(scale[7].midi-scale[0].midi,12);
    const eligible=rows.filter(r=>(r.midi-key.root+120)%12===0&&rows.some(x=>x.midi===r.midi+12));
    assert.equal(Math.abs(scale[0].midi-69),Math.min(...eligible.map(r=>Math.abs(r.midi-69))));
    let widths=0, threeStrings=0;
    const ascending=[...rows].reverse();
    for(let i=0;i<20;i++){
      const melody=makeKeyMelody(rows,key,progression(key,'基本',4,true));
      assert.equal(melody.length,16);
      assert.equal((cellMidi(melody[12],shapes)-key.root+120)%12,0);
      assert.ok(cellMidi(melody[12],shapes)>=62&&cellMidi(melody[12],shapes)<=74);
      assert.deepEqual(melody.slice(13),['ー','ー','ー']);
      const notes=melody.filter(c=>c&&typeof c==='object');
      const indices=notes.map(c=>ascending.findIndex(r=>r.string===c.string&&r.finger===c.finger));
      assert.ok(indices.every(n=>n>=0));
      for(let n=1;n<indices.length;n++){
        const d=Math.abs(indices[n]-indices[n-1]);
        assert.ok(d<=3);
        if(d===3){const chord=progression(key,'基本',4,true)[Math.floor(n/4)];assert.ok(chord.pcs.includes(ascending[indices[n-1]].midi%12)&&chord.pcs.includes(ascending[indices[n]].midi%12));}
      }
      widths+=Math.max(...indices)-Math.min(...indices);
      if(new Set(notes.map(c=>c.string)).size>=3)threeStrings++;
    }
    assert.ok(widths/20>=6,`平均幅 ${widths/20}`);
    assert.ok(threeStrings>=10,`3弦以上 ${threeStrings}/20`);
  });
}
test('natural minor chords and progressions remain within the scale',()=>{
  for(const key of KEYS.filter(k=>k.type==='minor')){
    assert.deepEqual(chords(key,true).map(ch=>ch.degree),['i','iv','v','VI','III','VII']);
    for(const ch of chords(key,true)) assert.ok(ch.pcs.every(pc=>inScale(pc,key)));
    for(const name of ['王道進行','カノン進行','小室進行','イチロクニーゴー','基本','丸の内','ランダム'])
      for(const ch of progression(key,name,8,true)) assert.ok(ch.pcs.every(pc=>inScale(pc,key)),`${key.id}: ${name} ${ch.name}`);
    assert.equal(chords(key)[2].degree,'V');
  }
});
test('F and D minor include B-flat on E string finger four',()=>{
  for(const id of ['F','Dm']){
    const key=KEYS.find(k=>k.id===id), shapes=keyShapes(key);
    assert.deepEqual(shapes.E.slice(2),[5,6]);
    assert.equal(cellMidi({string:'E',finger:4},shapes),82);
    assert.ok(keyRows(key,shapes).some(row=>row.string==='E'&&row.finger===4&&row.midi===82));
  }
});
test('key route basic minor progression uses i iv v i',()=>{
  const key=KEYS.find(k=>k.id==='Am');
  assert.deepEqual(progression(key,'基本',4,true).map(ch=>ch.name),['Am','Dm','Em','Am']);
  assert.deepEqual(progression(key,'基本',4,false).map(ch=>ch.name),['C','F','G','C']);
  assert.deepEqual(progression(key,'カノン進行',4,true).map(ch=>ch.name),['C','G','Am','Em']);
});
