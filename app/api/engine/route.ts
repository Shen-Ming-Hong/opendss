import { ready, runModel } from '../../../engine/runtime';
export const dynamic = 'force-dynamic';
export async function GET() {
  try{await ready();return Response.json({ok:true,engine:'OpenDSS-C WASM',runtime:'Workers'},{headers:{'Cache-Control':'no-store'}});}
  catch{return Response.json({error:'雲端引擎暫時無法載入，請稍後重試。'},{status:503});}
}
export async function POST(request:Request) {
  if(request.headers.get('origin')!==new URL(request.url).origin)return Response.json({error:'請從本站送出計算。'},{status:403});
  const reader=request.body?.getReader();
  if(!reader)return Response.json({error:'請提供模型內容。'},{status:400});
  const chunks:Uint8Array[]=[];let size=0;
  while(true){const chunk=await reader.read();if(chunk.done)break;size+=chunk.value.length;if(size>4*1024*1024){await reader.cancel();return Response.json({error:'上傳資料不可超過 4 MB。'},{status:413});}chunks.push(chunk.value);}
  const body=new Uint8Array(size);let offset=0;
  for(const chunk of chunks){body.set(chunk,offset);offset+=chunk.length;}
  try{return Response.json(await runModel(JSON.parse(new TextDecoder().decode(body))),{headers:{'Cache-Control':'no-store'}});}
  catch(error){return Response.json({error:error instanceof Error?error.message:'引擎執行失敗，請檢查模型。'},{status:422});}
}
