// JSON file store. In the pilot this is replaced by the centre's Google
// Sheets (see apps-script/); for the demo a local file keeps it simple.

const fs = require('fs');
const path = require('path');
const { buildSeed, isoDate } = require('./seed');

class Store {
  constructor(file, { now = () => new Date() } = {}) {
    this.file = file;
    this.now = now;
    this.state = null;
  }

  load() {
    if (this.file && fs.existsSync(this.file)) {
      try {
        this.state = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      } catch (err) {
        this.state = null;
      }
    }
    // Demo data is relative to "today": reseed when the day changes.
    if (!this.state || this.state.today !== isoDate(this.now())) this.reset();
    return this.state;
  }

  reset() {
    this.state = buildSeed(this.now());
    this.save();
    return this.state;
  }

  save() {
    if (!this.file) return;
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.state, null, 2));
    fs.renameSync(tmp, this.file);
  }
}

module.exports = { Store };
