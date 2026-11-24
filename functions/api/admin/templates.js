export async function onRequest({request,env}){
 const out=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
 const hash=async s=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))).join(',');
 if(!env.ADMIN_TOKEN||env.ADMIN_TOKEN.length<32||await hash(request.headers.get('Authorization')||'')!==await hash('Bearer '+env.ADMIN_TOKEN))return out({error:'Unauthorized'},401);
 if(!env.DB)return out({error:'Database unavailable'},503);
 try{
 if(request.method==='GET'){
 const products=await env.DB.prepare('SELECT id,title,price_cents,active,requirements,CASE WHEN object_key IS NULL THEN 0 ELSE 1 END AS has_file FROM template_products ORDER BY price_cents').all();
 const orders=await env.DB.prepare('SELECT id,email,status,total_cents,created_at FROM template_orders ORDER BY created_at DESC LIMIT 100').all();
 return out({products:products.results,orders:orders.results});
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