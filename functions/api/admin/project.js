export async function onRequest({request,env}){
 const reply=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
 if(!env.ADMIN_TOKEN||env.ADMIN_TOKEN.length<32||!env.DB||!env.PROJECTS_BUCKET)return reply({error:'Not configured'},503);
 const enc=new TextEncoder(),a=new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(request.headers.get('Authorization')||''))),b=new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode('Bearer '+env.ADMIN_TOKEN)));let diff=0;for(let i=0;i<a.length;i++)diff|=a[i]^b[i];if(diff)return reply({error:'Unauthorized'},401);
 const db=env.DB,bucket=env.PROJECTS_BUCKET,u=new URL(request.url),id=u.searchParams.get('id'),action=u.searchParams.get('action');
 try{
 const p=await db.prepare('SELECT p.*,c.artist_name,c.email,c.instagram FROM projects p JOIN customers c ON c.id=p.customer_id WHERE p.id=?').bind(id).first();if(!p)return reply({error:'Project not found'},404);
 if(request.method==='GET'&&action==='details'){const f=await db.prepare('SELECT id,original_name,size_bytes,status,created_at FROM project_files WHERE project_id=? ORDER BY created_at').bind(id).all();return reply({project:p,files:f.results})}
 if(request.method==='POST'&&action==='update'){const d=await request.json();if(!['pending','submitted','in_progress','revision','delivered','cancelled'].includes(d.status)||!['unpaid','paid','refunded'].includes(d.payment_status))return reply({error:'Invalid status'},400);if(p.status==='uploading')return reply({error:'Upload in progress'},409);await db.prepare("UPDATE projects SET status=?,payment_status=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND status!='uploading'").bind(d.status,d.payment_status,id).run();return reply({ok:true})}
 if(request.method==='POST'&&action==='bulk-delete'){
 const d=await request.json();if(!Array.isArray(d.ids)||!d.ids.length||d.ids.length>100||d.ids.some(x=>typeof x!=='string'))return reply({error:'Select 1–100 files'},400);
 const results=[];for(const fid of new Set(d.ids)){try{const f=await db.prepare("SELECT * FROM project_files WHERE id=? AND project_id=? AND status='uploaded'").bind(fid,id).first();if(!f){results.push({id:fid,ok:false});continue}await bucket.delete(f.object_key);await db.prepare("UPDATE project_files SET status='deleted',deleted_at=CURRENT_TIMESTAMP WHERE id=? AND status='uploaded'").bind(fid).run();results.push({id:fid,ok:true})}catch{results.push({id:fid,ok:false})}}return reply({results})}
 if(action==='download'||action==='delete'){
 const f=await db.prepare('SELECT * FROM project_files WHERE id=? AND project_id=?').bind(u.searchParams.get('file'),id).first();if(!f)return reply({error:'File not found'},404);
 if(request.method==='GET'&&action==='download'){if(f.status!=='uploaded')return reply({error:'File unavailable'},409);const obj=await bucket.get(f.object_key);if(!obj)return reply({error:'File missing from storage'},404);return new Response(obj.body,{headers:{'Content-Type':'application/octet-stream','Content-Length':String(obj.size),'Content-Disposition':"attachment; filename*=UTF-8''"+encodeURIComponent(f.original_name).replace(/['()*]/g,c=>'%'+c.charCodeAt(0).toString(16)),'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}})}
 if(request.method==='POST'&&action==='delete'){if(f.status==='deleted')return reply({ok:true});if(f.status!=='uploaded')return reply({error:'Only completed uploads can be deleted here'},409);await bucket.delete(f.object_key);await db.prepare("UPDATE project_files SET status='deleted',deleted_at=CURRENT_TIMESTAMP WHERE id=? AND status='uploaded'").bind(f.id).run();return reply({ok:true})}
 }
 return reply({error:'Unsupported operation'},400);
 }catch{return reply({error:'Project operation failed'},500)}
}