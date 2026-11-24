(()=>{'use strict';
const products=[['starter','MODD Starter',0],['essentials','MODD Essentials',3999],['signature','MODD Signature',9999],['elite','MODD Elite',14999],['custom','MODD Custom',24999]];
const selected=new Set();try{const stored=JSON.parse(localStorage.getItem('modd_template_cart_v1')||'[]');if(Array.isArray(stored))for(const p of products)if(stored.includes(p[0]))selected.add(p[0])}catch{}
const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n/100);
const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n};
const cart=document.getElementById('template-cart');if(!cart)return;
const buttons=[];
function render(){try{localStorage.setItem('modd_template_cart_v1',JSON.stringify([...selected]))}catch{}
cart.replaceChildren(el('h2','Your template cart'),el('p','Preview only — orders and payments are not open yet.'));
let total=0;for(const p of products.filter(p=>selected.has(p[0]))){total+=p[2];const row=el('div');row.className='cart-row';row.append(el('span',p[1]+' · '+money(p[2])));const remove=el('button','Remove');remove.type='button';remove.onclick=()=>{selected.delete(p[0]);render()};row.append(remove);cart.append(row)}
if(!selected.size)cart.append(el('p','Select a template above to preview your order.'));
cart.append(el('h3','Subtotal: '+money(total)),el('p','Final compatibility, licensing and any applicable tax will be confirmed before launch.'));
const checkout=el('button','Checkout — coming soon');checkout.disabled=true;cart.append(checkout);
for(const [b,p] of buttons){b.textContent=selected.has(p[0])?'Remove from cart':'Add to preview cart';b.setAttribute('aria-pressed',String(selected.has(p[0])))}}
document.querySelectorAll('.product').forEach((node,i)=>{const p=products[i];if(!p)return;const b=el('button');b.type='button';b.className='template-add';b.onclick=()=>{selected.has(p[0])?selected.delete(p[0]):selected.add(p[0]);render()};node.querySelector('.body').append(b);buttons.push([b,p])});render();
})();