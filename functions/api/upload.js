const MAX=5000000000, PART=10000000;
const hash=async s=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s))),x=>x.toString(16).padStart(2,'0')).join('');
export async function onRequestPost({request,env}){
 const out=(v,status=200)=>Response.json(v,{status,headers:{'Cache-Control':'no-store'}});
 try{
 const db=env.DB,bucket=env.PROJECTS_BUCKET;
 if(!db||!bucket)return out({error:'Not configured'},503);
 const token=request.headers.get('Authorization')||'';
 
 const url=new URL(request.url),action=url.searchParams.get('action');
 if(action==='invite'||action==='guest'){
 if(action==='guest'){
 if(!env.TURNSTILE_SECRET_KEY)return out({error:'Verification not configured'},503);
 }else{
 if(!env.ADMIN_TOKEN||env.ADMIN_TOKEN.length<32||await hash(token)!==await hash('Bearer '+env.ADMIN_TOKEN))return out({error:'Unauthorized'},401);
 }
 const d=await request.json();
 if(action==='guest'){const verify=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',body:new URLSearchParams({secret:env.TURNSTILE_SECRET_KEY,response:String(d.challenge||''),remoteip:request.headers.get('CF-Connecting-IP')||''})});const v=await verify.json();if(!v.success||v.hostname!=='moddonthemix.com'||v.action!=='project_upload')return out({error:'Verification failed'},403);}
 const email=String(d.email||'').trim().toLowerCase(),artist=String(d.artist||'').trim(),ig=String(d.instagram||'').trim();
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||!artist||artist.length>200||!/^@?[\w.]{1,30}$/.test(ig)||!['mixing','mastering','mix-master','custom'].includes(d.service))return out({error:'Invalid project details'},400);
 const id=crypto.randomUUID(),secret=Array.from(crypto.getRandomValues(new Uint8Array(32)),x=>x.toString(16).padStart(2,'0')).join('');
 if(action==='guest'){const limits=await db.prepare("SELECT COUNT(*) AS n FROM projects WHERE created_at>datetime('now','-1 day') AND (customer_id IN (SELECT id FROM customers WHERE email=?) OR status IN ('pending','uploading'))").bind(email).first();if(limits.n>=10)return out({error:'Submission capacity reached; contact the engineer'},429);}
 await db.batch([db.prepare('INSERT INTO customers(id,email,artist_name,instagram) VALUES(?,?,?,?) ON CONFLICT(email) DO NOTHING').bind(crypto.randomUUID(),email,artist,ig),db.prepare('INSERT INTO projects(id,customer_id,service,notes,reference_url) SELECT ?,id,?,?,? FROM customers WHERE email=?').bind(id,d.service,String(d.notes||'').slice(0,4000),String(d.reference||'').slice(0,1000),email),db.prepare("INSERT INTO upload_authorizations(token_hash,project_id,expires_at) VALUES(?,?,datetime('now','+2 days'))").bind(await hash(secret),id)]);
 return out({project:id,token:secret});
 }
 if(!/^Bearer [a-f0-9]{64}$/.test(token))return out({error:'Authorization required'},401);
 const auth=await db.prepare("SELECT a.project_id FROM upload_authorizations a JOIN projects p ON p.id=a.project_id WHERE token_hash=? AND revoked_at IS NULL AND expires_at>datetime('now') AND p.status IN ('pending','uploading')").bind(await hash(token.slice(7))).first();
 if(!auth)return out({error:'Invalid or expired upload authorization'},401);
 const project=auth.project_id;
 if(action==='start'){
 const d=await request.json(),size=d.size,name=String(d.name||'');
 if(!Number.isSafeInteger(size)||size<1||size>MAX||name.length>240||! /\.(wav|aiff?|zip|mp3|flac)$/i.test(name))return out({error:'Invalid file'},400);
 const triggers=await db.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE type='trigger' AND name IN ('file_reservation_limit','file_reservation_update_limit')").first();
 if(triggers.n!==2)return out({error:'Storage protection not installed'},503);
 const id=crypto.randomUUID(),key='projects/'+project+'/'+id;
 await db.prepare("INSERT INTO project_files(id,project_id,object_key,original_name,size_bytes,expires_at) VALUES(?,?,?,?,?,datetime('now','+30 days'))").bind(id,project,key,name,size).run();
 const upload=await bucket.createMultipartUpload(key);
 await db.prepare("UPDATE project_files SET multipart_id=?,status='uploading' WHERE id=?").bind(upload.uploadId,id).run();
 await db.prepare("UPDATE projects SET status='uploading' WHERE id=? AND status='pending'").bind(project).run();
 return out({id,partSize:PART});
 }
 if(action==='submit'){
 const result=await db.prepare("UPDATE projects SET status='submitted',updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='uploading' AND EXISTS(SELECT 1 FROM project_files WHERE project_id=? AND status='uploaded') AND NOT EXISTS(SELECT 1 FROM project_files WHERE project_id=? AND status IN ('reserved','uploading'))").bind(project,project,project).run();
 return result.meta.changes?out({project}):out({error:'Uploads incomplete'},409);
 }
 const id=url.searchParams.get('id'),f=await db.prepare("SELECT * FROM project_files WHERE id=? AND project_id=? AND status='uploading'").bind(id,project).first();
 if(!f)return out({error:'File not found'},404);
 const upload=bucket.resumeMultipartUpload(f.object_key,f.multipart_id),count=Math.ceil(f.size_bytes/PART);
 if(action==='part'){
 const n=Number(url.searchParams.get('n')),expected=Math.min(PART,f.size_bytes-(n-1)*PART);
 if(!Number.isInteger(n)||n<1||n>count||Number(request.headers.get('Content-Length'))!==expected)return out({error:'Invalid part size'},400);
 const bytes=await request.arrayBuffer();if(bytes.byteLength!==expected)return out({error:'Invalid body size'},400);
 return out(await upload.uploadPart(n,bytes));
 }
 if(action==='finish'){
 const d=await request.json();if(!Array.isArray(d.parts)||d.parts.length!==count||d.parts.some((p,i)=>p.partNumber!==i+1||typeof p.etag!=='string'))return out({error:'Invalid parts'},400);
 const obj=await upload.complete(d.parts);
 if(obj.size!==f.size_bytes){await bucket.delete(f.object_key);return out({error:'Size mismatch'},409)}
 await db.prepare("UPDATE project_files SET status='uploaded' WHERE id=?").bind(id).run();return out({ok:true});
 }
 return out({error:'Unknown action'},400);
 }catch(e){return out({error:'Upload operation failed; check authorization and storage capacity'},409)}
}