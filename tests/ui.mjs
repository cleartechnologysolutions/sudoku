import vm from 'node:vm';import fs from 'node:fs';import assert from 'node:assert/strict';
class Node{constructor(){this.children=[];this.classList={toggle(){}};this.hidden=false;this.textContent='';}replaceChildren(){this.children=[]}append(...n){this.children.push(...n)}setAttribute(){}animate(){this.animated=true}scrollIntoView(){} }
const els=new Map();const document={getElementById(id){if(!els.has(id))els.set(id,new Node());return els.get(id)},createElement(){return new Node()},addEventListener(){}};
const context=vm.createContext({document,location:{pathname:'/'},matchMedia:()=>({matches:false}),structuredClone,setTimeout:(fn)=>{fn()},navigator:{},window:{},console});
vm.runInContext(fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8'),context);
vm.runInContext(`state={wins:[0,0,0,0,0],game:{id:'one',level:0,status:'playing',givens:'0'.repeat(81),board:[...Array(9).fill(8),...Array(72).fill(0)],notes:Array.from({length:81},()=>[]),mistakes:0}};selected=8;render()`,context);
assert.equal(els.get('numbers').children.length,8);assert(!els.get('numbers').children.some(n=>n.textContent===8));assert.equal(els.get('victory').hidden,true);
await vm.runInContext(`(async()=>{const prev=structuredClone(state);state.game.board=Array.from({length:81},(_,i)=>i%9+1);state.game.status='won';await animateResult(prev,{type:'move'});})()`,context);
assert.equal(els.get('victory').hidden,false);assert.equal(els.get('numbers').children.length,0);assert(els.get('board').children.some(n=>n.animated));console.log('UI passed: completed digits hidden, win banner displayed, completed units animated.');
