import bank from './bank.js';
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
export function finishable(board){
 const empty=board.map((n,i)=>n? -1:i).filter(i=>i>=0);
 return empty.length>0&&empty.every(i=>{
 const used=new Set(board.filter((_,j)=>Math.floor(j/9)===Math.floor(i/9)||j%9===i%9||(Math.floor(j/27)===Math.floor(i/27)&&Math.floor(j%9/3)===Math.floor(i%9/3))));
 return [1,2,3,4,5,6,7,8,9].filter(n=>!used.has(n)).length===1;
 });
}
export class Player {
 constructor(ctx){this.ctx=ctx;this.queue=Promise.resolve();}
 async fetch(req){const task=this.queue.then(()=>this.handle(req));this.queue=task.catch(()=>{});return task;}
 async handle(req){let s=await this.ctx.storage.get('state')||{version:0,wins:[0,0,0,0,0],game:null};
 if(req.method==='GET')return json(s);
 let m;try{m=await req.json();}catch{return json({error:'Invalid request'},400);}
 if(m.version!==s.version)return json({error:'Your saved game changed. Loaded the latest board.',state:s},409);
 if(m.type==='new'){
 const level=m.level;if(!Number.isInteger(level)||level<0||level>4)return json({error:'Invalid difficulty'},400);
 if(level>0&&s.wins[level-1]<60)return json({error:'Complete 60 puzzles in the previous difficulty first.'},403);
 if(s.game?.status==='playing'&&!m.replace)return json({error:'Finish or replace your current board.'},400);
 const index=s.wins[level]%60,p=bank[level][index];
 let givens=p.givens;
 // More starting clues for new Easy boards; solutions and existing games stay stable.
 if(level===0){const a=[...givens];let count=a.filter(n=>n!=='0').length;for(let k=0;k<81&&count<46;k++){const i=(k*37+index*7)%81;if(a[i]==='0'){a[i]=p.solution[i];count++;}}givens=a.join('');}
 s.game={id:crypto.randomUUID(),level,index,givens,board:givens.split('').map(Number),notes:Array.from({length:81},()=>[]),mistakes:0,status:'playing',started:Date.now(),lastWrong:null};
 }else{
 const g=s.game,i=m.cell;if(!g||g.status!=='playing'||!Number.isInteger(i)||i<0||i>80||g.givens[i]!=='0')return json({error:'That cell cannot be changed.'},400);
 const n=m.number;if(!Number.isInteger(n)||n<0||n>9)return json({error:'Choose a number from 1 to 9.'},400);
 if(m.type==='note'){if(g.board[i])return json({error:'Erase this cell before adding notes.'},400);if(n)g.notes[i]=g.notes[i].includes(n)?g.notes[i].filter(v=>v!==n):[...g.notes[i],n].sort();else g.notes[i]=[];
 }else if(m.type==='move'){
 g.lastWrong=null;
 if(n===0){g.board[i]=0;g.notes[i]=[];}
 else if(Number(bank[g.level][g.index].solution[i])!==n){g.mistakes++;g.lastWrong={cell:i,number:n};if(g.mistakes>=3)g.status='failed';}
 else{g.board[i]=n;g.notes[i]=[];for(let j=0;j<81;j++)if(Math.floor(j/9)===Math.floor(i/9)||j%9===i%9||(Math.floor(j/27)===Math.floor(i/27)&&Math.floor(j%9/3)===Math.floor(i%9/3)))g.notes[j]=g.notes[j].filter(x=>x!==n);
 if(finishable(g.board)){g.board=[...bank[g.level][g.index].solution].map(Number);g.notes=Array.from({length:81},()=>[]);g.autoFinished=true;}
 if(g.board.join('')===bank[g.level][g.index].solution){g.status='won';s.wins[g.level]++;}}
 }else return json({error:'Unknown action'},400);
 }
 s.version++;await this.ctx.storage.put('state',s);return json(s);
 }
}
export default {async fetch(req,env){const url=new URL(req.url);if(url.pathname.startsWith('/api/')){const slug=url.pathname.slice(5);if(!/^[a-z0-9][a-z0-9_-]{0,39}$/.test(slug))return json({error:'Invalid player link'},400);if(!['GET','POST'].includes(req.method))return json({error:'Method not allowed'},405);if(req.method==='POST'){if(req.headers.get('Origin')!==url.origin)return json({error:'Invalid origin'},403);if(Number(req.headers.get('Content-Length')||0)>4096)return json({error:'Request too large'},413);}return env.PLAYERS.get(env.PLAYERS.idFromName(slug)).fetch(req);}
 if(['/app.js','/style.css','/favicon.svg'].includes(url.pathname))return env.ASSETS.fetch(req);
 if(url.pathname==='/'||/^\/[a-z0-9][a-z0-9_-]{0,39}$/.test(url.pathname)){url.pathname='/index.html';const asset=await env.ASSETS.fetch(new Request(url,req));const h=new Headers(asset.headers);h.set('Cache-Control','no-store');h.set('X-Content-Type-Options','nosniff');h.set('Referrer-Policy','no-referrer');h.set('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; frame-ancestors 'none'; base-uri 'none'");return new Response(asset.body,{status:asset.status,headers:h});}return new Response('Not found',{status:404});}};
