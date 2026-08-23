const fs = require('fs');
const p = 'components/AdminDashboard.tsx';
let c = fs.readFileSync(p, 'utf8').toString();
const out = [];
out.push('START..');

// 1. Import AdminServicesPanel
const imp = "import { AdminServicesPanel } from './AdminServicesPanel';";
if (!c.includes(imp)) {
  const m = "import { AdminInstructorsPanel } from './AdminInstructorsPanel';";
  if (c.includes(m)) { c = c.replace(m, m + '\n' + imp); out.push('IMPORT OK'); }
  else out.push('IMPORT MISS');
} else out.push('IMPORT EXISTS');

// 2. Type ServicePackage
if (!c.includes('ServicePackage')) {
  const m = "SiteContent,\n  TrainingCenter,";
  const r = "SiteContent,\n  ServicePackage,\n  TrainingCenter,";
  if (c.includes(m)) { c = c.replace(m, r); out.push('TYPE OK'); }
  else out.push('TYPE MISS');
}

// 3. Props interface
const pm = "// Instructor Academy\n  trainingCenters?: TrainingCenter[];";
const pr = "// Services Agence\n  services?: ServicePackage[];\n  serviceQuotes?: any[];\n  onAddService?: (service: ServicePackage) => void;\n  onUpdateService?: (service: ServicePackage) => void;\n  onDeleteService?: (id: string) => void;\n  onToggleServiceActive?: (id: string) => void;\n\n  // Instructor Academy\n  trainingCenters?: TrainingCenter[];";
if (c.includes(pm) && !c.includes('onAddService')) { c = c.replace(pm, pr); out.push('PROPS OK'); }
else out.push('PROPS ' + (c.includes('onAddService') ? 'EXISTS' : 'MISS'));

// 4. Destructuring
const dm = "trainingCenters = [],\n  instructorCommissions = [],\n  instructorStoragePurchases = [],\n  onAddInstructor,";
const dr = "services = [],\n  serviceQuotes = [],\n  onAddService,\n  onUpdateService,\n  onDeleteService,\n  onToggleServiceActive,\n  trainingCenters = [],\n  instructorCommissions = [],\n  instructorStoragePurchases = [],\n  onAddInstructor,";
if (c.includes(dm) && !c.includes('onAddService,')) { c = c.replace(dm, dr); out.push('DESTR OK'); }
else out.push('DESTR ' + (c.includes('onAddService,') ? 'EXISTS' : 'MISS'));

// 5. Type activeTab union
const tm = "| 'products' | 'quotes' | 'kyc'";
const tr = "| 'products' | 'services' | 'quotes' | 'kyc'";
if (c.includes(tm)) { c = c.replace(tm, tr); out.push('TABTYPE OK'); }
else out.push('TABTYPE MISS');

// 6. Briefcase import icon
if (!c.includes('Briefcase,')) {
  const im = "  Mail,\n  Globe,";
  if (c.includes(im)) { c = c.replace(im, im + '\n  Briefcase,'); out.push('ICON OK'); }
  else out.push('ICON MISS');
} else out.push('ICON EXISTS');

// 7. Tab nav button after products (utiliser le texte reel avec accents)
const tm2 = "Produits Numériques ({digitalProducts.length})";
if (!c.includes('Services Agence (')) {
  const btn = "\n          </button>\n          <button\n            onClick={() => setActiveTab('services')}\n            className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${activeTab === 'services' ? 'bg-[#D69E25] text-[#021231]' : 'text-slate-300 hover:bg-[#011D46]'}`}\n          >\n            <Briefcase className=\"w-3.5 h-3.5\" />\n            <span>Services Agence ({services.length})</span>\n          </button>";
  if (c.includes(tm2)) { c = c.replace(tm2, tm2 + btn); out.push('TAB OK'); }
  else out.push('TAB MISS');
} else out.push('TAB EXISTS');

// 8. Panel render before quotes
if (!c.includes("activeTab === 'services' &&")) {
  const qm = "{activeTab === 'quotes' && (";
  const render = "{activeTab === 'services' && (\n            <div className=\"p-6\">\n              <AdminServicesPanel\n                services={services}\n                serviceQuotes={serviceQuotes}\n                onAddService={onAddService || (() => {})}\n                onUpdateService={onUpdateService || (() => {})}\n                onDeleteService={onDeleteService || (() => {})}\n                onToggleServiceActive={onToggleServiceActive || (() => {})}\n              />\n            </div>\n          )}\n\n          " + qm;
  if (c.includes(qm)) { c = c.replace(qm, render); out.push('PANEL OK'); }
  else out.push('PANEL MISS');
} else out.push('PANEL EXISTS');

fs.writeFileSync(p, c);
out.push('DONE');
console.log(out.join('\n'));