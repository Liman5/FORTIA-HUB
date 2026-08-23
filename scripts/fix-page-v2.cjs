const fs = require('fs');
const p = 'components/pages/AdminPage.tsx';
let c = fs.readFileSync(p, 'utf8');

// Trouver la position de serviceQuotes et inserer les props services apres
const marker = 'serviceQuotes={serviceQuotes}';
if (c.includes(marker) && !c.includes('onAddService={addService}')) {
  const insertion = '\n      services={services}\n      onAddService={addService}\n      onUpdateService={updateService}\n      onDeleteService={deleteService}\n      onToggleServiceActive={toggleServiceActive}';
  c = c.replace(marker, marker + insertion);
  fs.writeFileSync(p, c);
  console.log('FIXED');
} else {
  console.log(c.includes('onAddService={addService}') ? 'ALREADY EXISTS' : 'MISS');
}