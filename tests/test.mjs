import assert from 'node:assert/strict';
import {Player} from '../worker/index.js';
import bank from '../worker/bank.js';
import {solve} from '../scripts/generate.mjs';
const records=new Map();const ctx={storage:{async get(k){return structuredClone(records.get(k))},async put(k,v){records.set(k,structuredClone(v))}}};
let player=new Player(ctx),state;
async function send(m,version=state?.version||0){const r=await player.fetch(new Request('https://test/api/adam',{method:'POST',body:JSON.stringify({...m,version})}));const d=await r.json();if(r.ok)state=d;return {r,d};}
assert.equal(new Set(bank.flat().map(p=>p.givens)).size,300);for(const p of bank.flat()){const solved=solve([...p.givens].map(Number));assert.equal(solved.count,1);assert.equal(solved.answer.join(''),p.solution);}
console.log('300 different puzzles, each with exactly one correct solution.');
assert.equal((await send({type:'new',level:1})).r.status,403);
await send({type:'new',level:0});let i=state.game.givens.indexOf('0'),solution=Number(bank[0][0].solution[i]);
await send({type:'note',cell:i,number:9});assert.deepEqual(state.game.notes[i],[9]);assert.equal(state.game.mistakes,0);
player=new Player(ctx);state=await (await player.fetch(new Request('https://test/api/adam'))).json();assert.deepEqual(state.game.notes[i],[9]);
let old=state.version;await send({type:'move',cell:i,number:solution});assert.equal(state.game.board[i],solution);assert.equal((await send({type:'move',cell:i,number:solution},old)).r.status,409);
for(let n=0;n<3;n++)await send({type:'move',cell:i,number:solution%9+1});assert.equal(state.game.status,'failed');assert.equal(state.wins[0],0);
assert.equal((await send({type:'move',cell:i,number:solution})).r.status,400);
await send({type:'new',level:0});for(let j=0;j<81;j++)if(!state.game.board[j])await send({type:'move',cell:j,number:Number(bank[0][0].solution[j])});assert.equal(state.game.status,'won');assert.equal(state.wins[0],1);
assert.equal((await send({type:'move',cell:i,number:solution})).r.status,400);assert.equal(state.wins[0],1);
for(let puzzle=1;puzzle<60;puzzle++){await send({type:'new',level:0});assert.equal(state.game.index,puzzle);for(let j=0;j<81;j++)if(!state.game.board[j])await send({type:'move',cell:j,number:Number(bank[0][puzzle].solution[j])});}assert.equal(state.wins[0],60);assert.equal((await send({type:'new',level:1})).r.status,200);assert.equal((await send({type:'new',level:2,replace:true})).r.status,403);
console.log('Passed: notes, resume, stale requests, 3-strike failure, wins counted once, 60-completion unlock, next tier stays locked.');
