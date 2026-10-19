import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import createDSS from '../../wasm/opendss.mjs';
const mod=new WebAssembly.Module(readFileSync(new URL('../../wasm/OpenDSSWasm.wasm',import.meta.url)));
async function fresh(){const d=await createDSS({noInitialRun:true,instantiateWasm(imports,done){const i=new WebAssembly.Instance(mod,imports);done(i);return i.exports;},print:()=>{},printErr:()=>{}});d.FS.mkdir('/work');d.FS.chdir('/work');return d;}
const out={};
for(const [k,fault] of [['snap',0],['fault',1]]){const d=await fresh();d.FS.writeFile('/work/example.dss',readFileSync(new URL('./example.dss',import.meta.url)));out[k]=JSON.parse(d.ccall('DSS_Run','string',['string','string','number','number'],['/work/example.dss','',fault,0]));}
const dir=process.argv[2];
if(dir){const d=await fresh();
for(const n of readdirSync(dir).filter(n=>/\.(dss|csv|dat)$/i.test(n)))d.FS.writeFile('/work/'+n,readFileSync(dir+'/'+n));
const t=performance.now();out.ieee=JSON.parse(d.ccall('DSS_Run','string',['string','string','number','number'],['/work/IEEE123Master.dss','',0,0]));out.ieeeMs=performance.now()-t;}
console.log('snap',out.snap.error,out.snap.converged,out.snap.power);
console.log('fault',out.fault.error,out.fault.buses?.map(b=>[b.name,b.faultAmps.map(x=>x.toFixed(1))]));
if(dir)console.log('ieee',out.ieee.error,out.ieee.converged,out.ieee.buses?.length,out.ieee.elements?.length,out.ieee.power,out.ieeeMs.toFixed(0)+'ms');
