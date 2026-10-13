// Copies the shared rules (lib/core.js) into the Apps Script project so the
// Google Sheets add-on and the web prototype always mark the same way.
//   npm run build:gas

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'lib', 'core.js'), 'utf8');
const banner = '// GENERATED from lib/core.js by `npm run build:gas`. Edit lib/core.js instead.\n\n';
fs.writeFileSync(path.join(root, 'apps-script', 'Core.gs'), banner + src);
console.log('Wrote apps-script/Core.gs');
