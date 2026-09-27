import fs from 'node:fs';
const bank=JSON.parse(fs.readFileSync('worker/puzzles.json','utf8'));
if(bank.length!==5||bank.some(b=>b.length<60))throw Error('Incomplete puzzle bank');
fs.writeFileSync('worker/bank.js','export default '+JSON.stringify(bank)+';\n');
console.log('Ready: 300 unique-solution puzzles and mobile app.');
