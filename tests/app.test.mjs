import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const src=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const controls={};
const ctx={state:{string:'A',shapes:{A:[2,4,5,7],G:[2,4,5,7]},bars:4,view:0,melody:Array(16).fill(null),noteLen:1,ending:0},history:[],audio:{playing:false,ctx:{currentTime:0},unlock:()=>Promise.resolve(),tone(){},releaseAll(){}},midi:()=>69,save(){},render(){},findKeys:()=>[{finger:0}],$:s=>controls[s]??=( {})};
vm.createContext(ctx);
vm.runInContext(src.slice(src.indexOf('function change('),src.indexOf('const button=')),ctx);
vm.runInContext(src.slice(src.indexOf('function remember()'),src.indexOf('function go(')),ctx);
vm.runInContext(src.match(/\$\('#undo'\)\.onclick=.*?;\$\('#clear-all'\)/)[0].replace(/;\$\('#clear-all'\)$/,''),ctx);
const bars=src.match(/remember\(\);state\.bars=v;state\.melody=Array\.from\(\{length:v\*4\}.*?state\.view=Math\.min\(state\.view,v\/2-1\)/)[0];
function setBars(v){ctx.v=v;vm.runInContext(bars,ctx)}
function undo(){controls['#undo'].onclick()}
function valid(){assert.equal(ctx.state.melody.length,ctx.state.bars*4);assert.ok(ctx.state.view>=0&&ctx.state.view<ctx.state.bars/2);for(let i=0;i<ctx.state.melody.length;i++)if(ctx.state.melody[i]==='ー')assert.ok(i>0&&ctx.state.melody[i-1]!==null&&ctx.state.melody[i-1]!=='休')}
setBars(8);ctx.state.view=3;setBars(4);undo();valid();assert.equal(ctx.state.bars,8);assert.equal(ctx.state.view,3);undo();valid();assert.equal(ctx.state.bars,4);
ctx.state.noteLen=4;ctx.place(0,1);ctx.state.noteLen=1;ctx.place(1,2);assert.deepEqual(JSON.parse(JSON.stringify(ctx.state.melody.slice(0,4))),[{string:'A',finger:1},{string:'A',finger:2},null,null]);
ctx.change(()=>{ctx.state.string='G';ctx.state.melody=ctx.state.melody.map(c=>c&&typeof c==='object'?{...c,string:'G'}:c)});assert.equal(ctx.history.length,0);undo();assert.ok(ctx.state.melody.filter(c=>c&&typeof c==='object').every(c=>c.string==='G'));valid();
ctx.state.melody.fill(null);let seed=1234;const rand=n=>(seed=(Math.imul(seed,1664525)+1013904223)>>>0)%n;
for(let t=0;t<10000;t++){let i=rand(16),f=rand(5),len=[1,2,4][rand(3)],old=ctx.state.melody.map(c=>c&&typeof c==='object'?{...c}:c),owner=i;while(owner>=0&&old[owner]==='ー')owner--;let deleting=owner>=0&&old[owner]&&typeof old[owner]==='object'&&old[owner].finger===f;ctx.state.noteLen=len;ctx.place(i,f);valid();if(!deleting){assert.equal(ctx.state.melody[i].finger,f);let end=Math.min(i+len,16);for(let j=i+1;j<end;j++)assert.equal(ctx.state.melody[j],'ー');assert.notEqual(ctx.state.melody[end],'ー');}}
console.log('app tests passed (10000 edits)');
