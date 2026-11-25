export async function onRequestPost({request,env}){
const out=(d,status=200)=>Response.json(d,{status,headers:{'Cache-Control':'no-store'}});
try{
if(request.headers.get('Origin')!==new URL(request.url).origin)return out({error:'Invalid origin'},403);
if(!env.DB||!env.PROJECTS_BUCKET||!env.TURNSTILE_SECRET_KEY)return out({error:'Unavailable'},503);
if(Number(request.headers.get('Content-Length'))>10000)return out({error:'Request too large'},413);
const raw=await request.text();if(raw.length>10000)return out({error:'Request too large'},413);
const d=JSON.parse(raw),email=String(d.email||'').trim().toLowerCase();
if(email.length>254||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||d.accept!==true||!Array.isArray(d.ids)||d.ids.length!==1||d.ids[0]!=='starter')return out({error:'Select the free template and accept its license'},400);
const p=await env.DB.prepare("SELECT * FROM template_products WHERE id='starter' AND active=1 AND price_cents=0").first();
if(!p?.object_key?.startsWith('templates/starter/'))return out({error:'Free template not published yet'},409);
const verification=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',body:new URLSearchParams({secret:env.TURNSTILE_SECRET_KEY,response:String(d.challenge||'')})});
const v=await verification.json();if(!v.success||v.hostname!==new URL(request.url).hostname||v.action!=='template_free')return out({error:'Verification failed'},403);
const count=await env.DB.prepare("SELECT COUNT(*) n FROM template_orders WHERE email=? AND created_at>=datetime('now','-1 day')").bind(email).first();if(count.n>=5)return out({error:'Daily download limit reached'},429);
const obj=await env.PROJECTS_BUCKET.head(p.object_key);if(!obj)return out({error:'File unavailable'},503);
const id=crypto.randomUUID(),token=crypto.randomUUID()+crypto.randomUUID(),hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token))),x=>x.toString(16).padStart(2,'0')).join('');
await env.DB.batch([env.DB.prepare("INSERT INTO template_orders(id,email,status,total_cents) VALUES(?,?,'fulfilled',0)").bind(id,email),env.DB.prepare("INSERT INTO template_order_items(order_id,product_id,price_cents) VALUES(?,'starter',0)").bind(id),env.DB.prepare("INSERT INTO template_download_grants(token_hash,order_id,product_id,expires_at) VALUES(?,?,'starter',datetime('now','+1 day'))").bind(hash,id)]);
return out({order_id:id,token});
}catch{return out({error:'Registration unavailable'},503)}
}