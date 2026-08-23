const fs=require('fs');
const p='components/ServicesAgency.tsx';
let c=fs.readFileSync(p,'utf8');

// 1. Add accent
const a1='const isSelected = selectedService?.id === serv.id;';
const a2='const isSelected = selectedService?.id === serv.id;\n            const accent = serv.accentColor || \'#D69E25\';';
if(c.includes(a1)&&!c.includes('const accent')){c=c.replace(a1,a2);console.log('A1 OK');}

// 2. Replace card class
const b1='className={`bg-white rounded-2xl border p-6 shadow-md transition duration-300 cursor-pointer flex flex-col justify-between space-y-5 relative ${isSelected ? \'border-[#D69E25] ring-2 ring-[#D69E25] shadow-xl bg-amber-50/20\' : \'border-slate-200 hover:border-[#D69E25]/50\'}`}';
const b2='className={[\'bg-white rounded-2xl border p-6 shadow-md cursor-pointer flex flex-col justify-between space-y-5 relative\',getBorderClasses(serv.borderStyle),getAnimationClasses(serv.cardAnimation),isSelected ? \'ring-4 ring-offset-2\' : \'\',serv.featured ? \'lg:scale-105 lg:z-10\' : \'\'].join(\' \')}';
if(c.includes(b1)){c=c.replace(b1,b2);console.log('A2 OK');}

// 3. Icon color
const d1='<div className="w-12 h-12 rounded-xl bg-[#021231] text-[#D69E25] flex items-center justify-center shadow-md">';
const d2='<div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md" style={{ backgroundColor: accent, color: \'#021231\' }}>';
if(c.includes(d1)){c=c.replace(d1,d2);console.log('A3 OK');}

// 4. Check color
const e1='<Check className="w-3.5 h-3.5 text-[#D69E25] shrink-0 mt-0.5" />';
const e2='<Check className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: accent }} />';
if(c.includes(e1)){c=c.replace(e1,e2);console.log('A4 OK');}

// 5. Clock color
const f1='<Clock className="w-3.5 h-3.5 text-[#D69E25]" />';
const f2='<Clock className="w-3.5 h-3.5" style={{ color: accent }} />';
if(c.includes(f1)){c=c.replace(f1,f2);console.log('A5 OK');}

fs.writeFileSync(p,c);
console.log('PART1 DONE');