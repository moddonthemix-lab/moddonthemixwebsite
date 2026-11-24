export async function onRequestGet({env}){
try{const r=await env.DB.prepare("SELECT id,title,price_cents,requirements FROM template_products ORDER BY price_cents").all();return Response.json({products:r.results,checkout_enabled:false},{headers:{'Cache-Control':'no-store'}})}catch{return Response.json({error:'Catalog unavailable'},{status:503})}
}