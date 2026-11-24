export async function onRequestGet({request,env}) {
 const headers={'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
 const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers});
 if(!env.ADMIN_TOKEN || env.ADMIN_TOKEN.length<32 || !env.DB) return reply({error:'Not configured'},503);
 const supplied=request.headers.get('Authorization')||'';
 const encoder=new TextEncoder();
 const a=new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(supplied)));
 const b=new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode('Bearer '+env.ADMIN_TOKEN)));
 let diff=0;for(let i=0;i<a.length;i++)diff|=a[i]^b[i];
 if(diff) return reply({error:'Unauthorized'},401);
 try{
 const [counts,storage,projects]=await env.DB.batch([
 env.DB.prepare("SELECT COUNT(*) AS total, COALESCE(SUM(status='submitted'),0) AS submitted, COALESCE(SUM(status='in_progress'),0) AS in_progress, COALESCE(SUM(payment_status='paid'),0) AS paid FROM projects"),
 env.DB.prepare("SELECT COALESCE(SUM(size_bytes),0) AS reserved_bytes FROM project_files WHERE status IN ('reserved','uploading','uploaded')"),
 env.DB.prepare("SELECT p.id,p.service,p.status,p.payment_status,p.created_at,c.artist_name,c.email,c.instagram FROM projects p JOIN customers c ON p.customer_id=c.id ORDER BY p.created_at DESC LIMIT 200")
 ]);
 return reply({...counts.results[0],...storage.results[0],projects:projects.results});
 }catch{return reply({error:'Database unavailable'},500)}
}