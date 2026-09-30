import vm from 'node:vm';import fs from 'node:fs';import assert from 'node:assert/strict';
class Node{constructor(){this.children=[];this.classList={toggle(){}};this.hidden=false;this.textContent='';}replaceChildren(){this.children=[]}append(...n){this.children.push(...n)}setAttribute(){}animate(){this.animated=true}scrollIntoView(){} }
const els=new Map();const document={getElementById(id){if(!els.has(id))els.set(id,new Node());return els.get(id)},createElement(){return new Node()},addEventListener(){}};
const context=vm.createContext({document,location:{pathname:'/'},matchMedia:()=>({matches:false}),structuredClone,setTimeout:(fn)=>{fn()},navigator:{},window:{},console});
vm.runInContext(fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8'),context);
vm.runInContext(`state={wins:[0,0,0,0,0],game:{id:'one',level:0,status:'playing',givens:'0'.repeat(81),board:[...Array(9).fill(8),...Array(72).fill(0)],notes:Array.from({length:81},()=>[]),mistakes:0}};selected=8;render()`,context);
assert.equal(els.get('numbers').children.length,8);assert(!els.get('numbers').children.some(n=>n.textContent===8));assert.equal(els.get('victory').hidden,true);
await vm.runInContext(`(async()=>{const prev=structuredClone(state);state.game.board=Array.from({length:81},(_,i)=>i%9+1);state.game.status='won';await animateResult(prev,{type:'move'});})()`,context);
assert.equal(els.get('victory').hidden,false);assert.equal(els.get('numbers').children.length,0);assert(els.get('board').children.some(n=>n.animated));console.log('UI passed: completed digits hidden, win banner displayed, completed units animated.');

// Delay saves to reproduce quick taps during the previous move's network request.
const requests=[];
context.fetch=(url,options)=>new Promise(resolve=>requests.push({action:JSON.parse(options.body),resolve}));
vm.runInContext(`state={version:0,wins:[0,0,0,0,0],game:{id:'tap',level:0,status:'playing',givens:'0'.repeat(81),board:Array(81).fill(0),notes:Array.from({length:81},()=>[]),mistakes:0}};selected=1;busy=false;render();play(0);selected=2;play(1);play(1);`,context);
assert.equal(requests.length,1);
let saved=structuredClone(vm.runInContext('state',context));saved.version=1;saved.game.board[0]=1;
requests[0].resolve({ok:true,json:async()=>saved});
await new Promise(resolve=>setImmediate(resolve));
assert.equal(requests.length,2);assert.equal(requests[1].action.cell,1);assert.equal(requests[1].action.number,2);assert.equal(requests[1].action.version,1);
saved=structuredClone(saved);saved.version=2;saved.game.board[1]=2;
requests[1].resolve({ok:true,json:async()=>saved});await new Promise(resolve=>setImmediate(resolve));
assert.equal(requests.length,2);assert.equal(vm.runInContext('state.game.board[1]',context),2);
vm.runInContext(`state.game.status='failed';state.game.mistakes=2;render()`,context);
assert.equal(els.get('failure').hidden,false);assert.equal(typeof els.get('replay').onclick,'function');assert.equal(typeof els.get('fresh-puzzle').onclick,'function');
console.log('UI passed: rapid taps queue with latest revision and captured number; duplicate pending taps suppressed; failure choices visible.');

for(const [completed,start,expected] of [[[4],4,5],[[4,5],4,6],[[9],9,1],[[9,1],9,2]]){
 context.completed=completed;context.start=start;
 vm.runInContext(`state.game.status='playing';state.game.board=[...completed.flatMap(n=>Array(9).fill(n)),...Array(81-completed.length*9).fill(0)];selected=start;render()`,context);
 assert.equal(vm.runInContext('selected',context),expected);
}
console.log('UI passed: completed digit advances upward, skips completed digits, and wraps after nine.');
