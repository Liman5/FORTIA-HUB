const fs=require('fs');
const p='components/ServicesAgency.tsx';
let c=fs.readFileSync(p,'utf8');
if(!c.includes('ShoppingCart')){
  c=c.replace('CheckCircle2\n}','CheckCircle2,\n  ShoppingCart\n}');
  console.log('CART OK');
}
const m='  // Calculate total estimated price';
if(!c.includes('getBorderClasses')){
  const h1='const getBorderClasses=(s)=>{switch(s){case "emerald":return "border-emerald-500 ring-2 ring-emerald-500/30";case "blue":return "border-blue-500 ring-2 ring-blue-500/30";case "purple":return "border-purple-500 ring-2 ring-purple-500/30";case "rose":return "border-rose-500 ring-2 ring-rose-500/30";case "gradient":return "border-transparent ring-2 ring-amber-400/40 bg-gradient-to-br from-amber-50 via-white to-emerald-50";case "double":return "border-2 border-double border-slate-400";case "none":return "border-slate-200";default:return "border-[#D69E25] ring-2 ring-[#D69E25]/30";}};';
  const h2='const getAnimationClasses=(a)=>{switch(a){case "fade-up":return "hover:-translate-y-2 transition-all duration-300 hover:shadow-2xl";case "zoom-in":return "hover:scale-105 transition-transform duration-300 hover:shadow-2xl";case "flip":return "hover:rotate-1 hover:scale-[1.02] transition-all duration-300 hover:shadow-2xl";case "slide-in":return "hover:translate-x-2 transition-all duration-300 hover:shadow-2xl";case "pulse":return "hover:animate-pulse transition-all duration-300 hover:shadow-2xl";default:return "transition-all duration-300 hover:shadow-2xl";}};';
  const h3='const activeServices=services.filter(s=>s.isActive!==false);';
  c=c.replace(m,'  '+h1+'\n  '+h2+'\n  '+h3+'\n'+m);
  console.log('HELPERS OK');
}
if(c.includes('services.map')){
  c=c.replace('services.map','activeServices.map');
  console.log('MAP OK');
}
fs.writeFileSync(p,c);
console.log('DONE');