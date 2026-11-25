export async function onRequest({request,env}){
 const out=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
 const hash=async s=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))).join(',');
 if(!env.ADMIN_TOKEN||env.ADMIN_TOKEN.length<32||await hash(request.headers.get('Authorization')||'')!==await hash('Bearer '+env.ADMIN_TOKEN))return out({error:'Unauthorized'},401);
 if(!env.DB)return out({error:'Database unavailable'},503);
 try{
 const u=new URL(request.url),action=u.searchParams.get('action'),id=u.searchParams.get('id');
 if(action==='upload'||action==='download'){
 if(!env.PROJECTS_BUCKET)return out({error:'Storage unavailable'},503);
 const p=await env.DB.prepare('SELECT object_key,active FROM template_products WHERE id=?').bind(id).first();
 if(!p||!['starter','essentials','elite'].includes(id))return out({error:'Invalid downloadable product'},400);
 if(action==='download'&&request.method==='GET'){
 if(!p.object_key||!p.object_key.startsWith('templates/'+id+'/'))return out({error:'No file'},404);
 const obj=await env.PROJECTS_BUCKET.get(p.object_key);if(!obj)return out({error:'File missing'},404);
 return new Response(obj.body,{headers:{'Cache-Control':'no-store','Content-Type':'application/zip','Content-Disposition':'attachment; filename="modd-'+id+'.zip"','X-Content-Type-Options':'nosniff'}});
 }
 if(action!=='upload'||request.method!=='POST')return out({error:'Method not allowed'},405);
 if(p.object_key||p.active)return out({error:'A file is already assigned; replacement is not enabled yet'},409);
 const size=Number(request.headers.get('Content-Length'));if(!Number.isInteger(size)||size<4||size>25000000)return out({error:'ZIP must be between 4 bytes and 25 MB'},400);
 const bytes=new Uint8Array(await request.arrayBuffer());if(bytes.length!==size||bytes[0]!==80||bytes[1]!==75||bytes[2]!==3||bytes[3]!==4)return out({error:'Invalid ZIP header'},400);
 const key='templates/'+id+'/'+crypto.randomUUID()+'.zip';
 await env.PROJECTS_BUCKET.put(key,bytes,{httpMetadata:{contentType:'application/zip'}});
 let result;try{result=await env.DB.prepare('UPDATE template_products SET object_key=?,active=0 WHERE id=? AND object_key IS NULL AND active=0').bind(key,id).run()}catch(e){await env.PROJECTS_BUCKET.delete(key).catch(()=>{});throw e}
 if(!result.meta.changes){await env.PROJECTS_BUCKET.delete(key);return out({error:'Product changed during upload'},409)}
 return out({ok:true});
 }
 if(request.method==='GET'){
 const products=await env.DB.prepare('SELECT id,title,price_cents,active,requirements,CASE WHEN object_key IS NULL THEN 0 ELSE 1 END AS has_file FROM template_products WHERE id IN (\'starter\',\'essentials\',\'elite\',\'custom\') ORDER BY price_cents').all();
 const orders=await env.DB.prepare('SELECT id,email,status,total_cents,created_at FROM template_orders ORDER BY created_at DESC LIMIT 100').all();
 return out({products:products.results.map(p=>({...p,title:({starter:'MODD Free',essentials:'MODD Essential'})[p.id]||p.title})),orders:orders.results});
 }
 if(request.method==='POST'){
 const d=await request.json();
 if(!['starter','essentials','signature','elite','custom'].includes(d.id)||!Number.isInteger(d.price_cents)||d.price_cents<0||d.price_cents>1000000||d.id==='starter'&&d.price_cents!==0||d.id!=='starter'&&d.price_cents===0||typeof d.requirements!=='string'||d.requirements.length>4000)return out({error:'Invalid product settings'},400);
 await env.DB.prepare('UPDATE template_products SET price_cents=?,requirements=?,active=0 WHERE id=?').bind(d.price_cents,d.requirements,d.id).run();
 return out({ok:true});
 }
 return out({error:'Method not allowed'},405);
 }catch{return out({error:'Template database operation failed'},503)}
}