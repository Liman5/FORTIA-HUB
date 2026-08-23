const fs = require('fs');
const p = 'components/pages/AdminPage.tsx';
let c = fs.readFileSync(p, 'utf8');
const markers = [];
const insertText = 'serviceQuotes={serviceQuotes}\n      services={services}\n      onAddService={addService}\n      onUpdateService={updateService}\n      onDeleteService={deleteService}\n      onToggleServiceActive={toggleServiceActive}\n      feeConfig={feeConfig}';
markers.push(['serviceQuotes={serviceQuotes}\n      feeConfig={feeConfig}', insertText]);
let done = false;
for (const [oldS, newS] of markers) {
  if (c.includes(oldS)) {
    c = c.replace(oldS, newS);
    done = true;
  }
}
fs.writeFileSync(p, c);
console.log(done ? 'FIXED' : 'DONE');