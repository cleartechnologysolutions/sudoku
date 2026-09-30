import assert from 'node:assert/strict';
import {Player,finishable} from '../worker/index.js';
import bank from '../worker/bank.js';
import {solve} from '../scripts/generate.mjs';
const records=new Map();const ctx={storage:{async get(k){return structuredClone(records.get(k))},async put(k,v){records.set(k,structuredClone(v))}}};
let player=new Player(ctx),state;
async function send(m,version=state?.version||0){const r=await player.fetch(new Request('https://test/api/adam',{method:'POST',body:JSON.stringify({...m,version})}));const d=await r.json();if(r.ok)state=d;return {r,d};}
assert.equal(new Set(bank.flat().map(p=>p.givens)).size,300);for(const p of bank.flat()){const solved=solve([...p.givens].map(Number));assert.equal(solved.count,1);assert.equal(solved.answer.join(''),p.solution);}
console.log('300 different puzzles, each with exactly one correct solution.');
assert.equal((await send({type:'new',level:1})).r.status,200);
assert.equal(state.wins[0],0);
assert.equal((await send({type:'new',level:2,replace:true})).r.status,403);
await send({type:'new',level:0,replace:true});let i=state.game.givens.indexOf('0'),solution=Number(bank[0][0].solution[i]);
await send({type:'note',cell:i,number:9});assert.deepEqual(state.game.notes[i],[9]);assert.equal(state.game.mistakes,0);
player=new Player(ctx);state=await (await player.fetch(new Request('https://test/api/adam'))).json();assert.deepEqual(state.game.notes[i],[9]);
let old=state.version;await send({type:'move',cell:i,number:solution});assert.equal(state.game.board[i],solution);assert.equal((await send({type:'move',cell:i,number:solution},old)).r.status,409);
for(let n=0;n<2;n++)await send({type:'move',cell:i,number:solution%9+1});assert.equal(state.game.status,'failed');assert.equal(state.wins[0],0);
assert.equal((await send({type:'move',cell:i,number:solution})).r.status,400);
await send({type:'new',level:0,replay:true});for(let j=0;j<81;j++)if(!state.game.board[j])await send({type:'move',cell:j,number:Number(bank[0][0].solution[j])});assert.equal(state.game.status,'won');assert.equal(state.wins[0],1);
assert.equal((await send({type:'move',cell:i,number:solution})).r.status,400);assert.equal(state.wins[0],1);
for(let puzzle=1;puzzle<60;puzzle++){await send({type:'new',level:0});assert.equal(state.game.index,puzzle);for(let j=0;j<81;j++)if(!state.game.board[j])await send({type:'move',cell:j,number:Number(bank[0][puzzle].solution[j])});}assert.equal(state.wins[0],60);assert.equal((await send({type:'new',level:1})).r.status,200);assert.equal((await send({type:'new',level:2,replace:true})).r.status,403);
console.log('Passed: notes, resume, stale requests, 2-strike failure, wins counted once, progression, next tier stays locked.');

const full=[...bank[0][0].solution].map(Number);const single=full.slice();single[0]=0;assert.equal(finishable(single),true);assert.equal(finishable(Array(81).fill(0)),false);assert.equal(finishable(full),false);
state.wins[0]=0;state.nextPuzzle=[0,0,0,0,0];state.game=null;await ctx.storage.put('state',state);await send({type:'new',level:0});assert.equal([...state.game.givens].filter(n=>n!=='0').length,46);
const editable=[...state.game.givens].flatMap((n,i)=>n==='0'?[i]:[]);state.game.board=full.slice();for(const i of editable.slice(0,2))state.game.board[i]=0;await ctx.storage.put('state',state);
await send({type:'move',cell:editable[0],number:full[editable[0]]});assert.equal(state.game.status,'won');assert.equal(state.game.autoFinished,true);assert.equal(state.wins[0],1);assert.equal(state.game.board.join(''),full.join(''));
console.log('Passed: easier Easy, no ambiguous auto-finish, automatic completion saved and counted once.');

for (const level of [2,3,4]) {
 for (const completed of [29,30]) {
  const saved={version:0,wins:[0,0,0,0,0],game:null};saved.wins[level-1]=completed;
  const db={storage:{get:async()=>structuredClone(saved),put:async()=>{}}};
  const p=new Player(db);
  const response=await p.fetch(new Request('https://test/api/boundary',{method:'POST',body:JSON.stringify({type:'new',level,version:0})}));
  assert.equal(response.status,completed===30?200:403);
 }
}
console.log('Passed: Medium available at zero Easy wins; Hard, Expert and Extreme require 30 previous-tier completions.');

// Replay uses the identical board; New puzzle advances without granting wins.
{
 const saved={version:0,wins:[0,0,0,0,0],game:null};
 const records=new Map([['state',saved]]);
 const ctx={storage:{get:async k=>structuredClone(records.get(k)),put:async(k,v)=>records.set(k,structuredClone(v))}};
 const p=new Player(ctx);let current=saved;
 const act=async a=>{const response=await p.fetch(new Request('https://test/api/replay',{method:'POST',body:JSON.stringify({...a,version:current.version})}));assert.equal(response.status,200);return current=await response.json();};
 await act({type:'new',level:1});const original=current.game.givens,idx=current.game.index;
 const cell=original.indexOf('0'),wrong=Number(bank[1][idx].solution[cell])%9+1;
 await act({type:'move',cell,number:wrong});assert.equal(current.game.status,'playing');
 await act({type:'move',cell,number:wrong});assert.equal(current.game.status,'failed');assert.equal(current.game.mistakes,2);
 await act({type:'new',level:1,replay:true});assert.equal(current.game.givens,original);assert.equal(current.game.mistakes,0);
 await act({type:'move',cell,number:wrong});await act({type:'move',cell,number:wrong});
 await act({type:'new',level:1});assert.notEqual(current.game.givens,original);assert.equal(current.wins[1],0);
}
console.log('Passed: second mistake ends game, replay resets identical board, new puzzle differs without granting wins.');
