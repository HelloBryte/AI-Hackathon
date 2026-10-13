// Tiny rendering helpers. `html` escapes every interpolated value unless it
// is wrapped in raw() or produced by another html`` call, so message text
// from WeChat can never inject markup.

export class Raw {
  constructor(s) { this.s = s; }
  toString() { return this.s; }
}

export const raw = (s) => new Raw(String(s));

export function esc(v) {
  return String(v === null || v === undefined ? '' : v).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function renderValue(v) {
  if (v instanceof Raw) return v.s;
  if (Array.isArray(v)) return v.map(renderValue).join('');
  if (v === null || v === undefined || v === false || v === true) return '';
  return esc(v);
}

export function html(strings, ...values) {
  let out = strings[0];
  values.forEach((v, i) => { out += renderValue(v) + strings[i + 1]; });
  return new Raw(out);
}

export const MASTERY_SHORT = {
  mastered: 'Mastered',
  partial: 'Partial',
  not_understood: 'Not understood',
  not_covered: 'Not covered',
};

export const BAND_LABEL = { pass: 'Pass', mid: 'Mid', low: 'Low', not_submitted: 'Not submitted' };

export function masteryChip(m, label) {
  return html`<span class="mchip m-${m}" title="${MASTERY_SHORT[m] || m}">${label || MASTERY_SHORT[m] || m}</span>`;
}

export function masteryBar(summary) {
  const t = summary.total || 1;
  const c = summary.counts;
  const seg = (n, cls, name) => (n ? html`<span class="${cls}" style="width:${(n / t) * 100}%" title="${name}: ${n}"></span>` : '');
  return html`<div class="bar" role="img" aria-label="${c.mastered} mastered, ${c.partial} partial, ${c.not_understood} not understood, ${c.not_covered} not covered">
    ${seg(c.mastered, 'm-mastered', 'Mastered')}${seg(c.partial, 'm-partial', 'Partial')}${seg(c.not_understood, 'm-not_understood', 'Not understood')}${seg(c.not_covered, 'm-not_covered', 'Not covered')}
  </div>`;
}

export function bandBadge(band, text) {
  const cls = band === 'pass' ? 'b-pass' : band === 'mid' ? 'b-mid' : band === 'low' ? 'b-low' : 'b-none';
  return html`<span class="badge ${cls}">${text || BAND_LABEL[band] || band}</span>`;
}

export function outcome(o) {
  const label = o === 'BLANK' ? '\\Blank\\' : o;
  return html`<span class="oc oc-${o}">${label}</span>`;
}

export function statusChip(status, mode) {
  const map = {
    on_site: ['On site', 'tone-ok'],
    expected: ['Expected', 'tone-info'],
    leave: ['On leave', 'tone-bad'],
    rescheduled: ['Rescheduled', 'tone-warn'],
  };
  const [label, tone] = map[status] || [status, ''];
  return html`<span class="chip ${tone}">${label}</span>${mode === 'online' && status !== 'leave' ? html` <span class="chip tone-warn">Online</span>` : ''}`;
}

export function langChip(lang) {
  const map = { en: 'EN', zh: '中文', mixed: '中/EN' };
  return html`<span class="chip">${map[lang] || lang}</span>`;
}

export function timeOf(iso) {
  return String(iso || '').slice(11, 16);
}

export function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(`${String(iso).slice(0, 10)}T00:00:00`);
  return d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });
}

export function pct(n) {
  return `${Math.round(n * 10) / 10}%`;
}

export function plural(n, word, pluralWord) {
  return `${n} ${n === 1 ? word : (pluralWord || `${word}s`)}`;
}
