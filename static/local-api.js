// Browser entry for the single-file build (npm run build:static).
// Runs the same API as server.js inside the page, with the demo state kept
// in this browser's localStorage. Claude is off here: drafts use the rules.

globalThis.process = globalThis.process || { env: { SHIFTMATE_AI: 'off' } };

const { createApi } = require('../lib/api');
const { buildSeed, isoDate } = require('../lib/seed');

const KEY = 'shiftmate-demo-state';

const store = {
  state: null,
  load() {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) this.state = JSON.parse(raw);
    } catch (err) {
      this.state = null;
    }
    if (!this.state || this.state.today !== isoDate(new Date())) this.reset();
  },
  reset() {
    this.state = buildSeed(new Date());
    this.save();
    return this.state;
  },
  save() {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(this.state));
    } catch (err) {
      // Private windows can block storage; the demo still works in memory.
    }
  },
};

store.load();

const handle = createApi({
  store,
  aiStatus: () => ({ enabled: false, model: null, reason: 'Single-file browser demo (no server)' }),
});

window.SHIFTMATE_LOCAL_API = (method, url, body) => {
  const { pathname } = new URL(url, 'http://local');
  return handle(method, pathname, body || {});
};
