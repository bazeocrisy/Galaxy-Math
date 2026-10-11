/* Galaxy Math pictures: equal groups, arrays, number-line jumps and labelled equations, drawn as inline SVG/HTML
   strings from small spec objects ({ kind: 'array', rows: 3, cols: 4 }). Pure functions (window.GalaxyVisuals / Node). */
(function (root) {
  'use strict';

  const C = { dot: '#6A35D9', dot2: '#D9366F', ring: '#2B8DBE', ringFill: '#E3F3FF', line: '#1B1F4B', faded: '#B9B3D6' };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const plural = (n, w) => `${n} ${n === 1 ? w : w + 's'}`;

  function svg(w, h, label, body, cls = '') {
    return `<svg class="viz ${cls}" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${esc(label)}">${body}</svg>`;
  }

  /** Dots arranged in a small grid inside one circle; sizes[i] dots in group i. */
  function groupsFigure(sizes, label) {
    const max = Math.max(1, ...sizes);
    const cols = Math.ceil(Math.sqrt(max)), rows = Math.ceil(max / cols);
    const cell = 15, r = Math.max(26, Math.ceil(Math.hypot(cols * cell, rows * cell) / 2) + 7);
    const gap = 12, per = Math.min(5, sizes.length), lines = Math.ceil(sizes.length / per);
    const w = per * (2 * r + gap) + gap, h = lines * (2 * r + gap) + gap;
    let body = '';
    sizes.forEach((n, i) => {
      const cx = gap + r + (i % per) * (2 * r + gap), cy = gap + r + Math.floor(i / per) * (2 * r + gap);
      body += `<circle class="grp" cx="${cx}" cy="${cy}" r="${r}" fill="${C.ringFill}" stroke="${C.ring}" stroke-width="3"/>`;
      const c2 = Math.ceil(Math.sqrt(n)) || 1, r2 = Math.ceil(n / c2);
      for (let k = 0; k < n; k++) {
        const x = cx - ((c2 - 1) * cell) / 2 + (k % c2) * cell, y = cy - ((r2 - 1) * cell) / 2 + Math.floor(k / c2) * cell;
        body += `<circle class="dot" cx="${x}" cy="${y}" r="5.5" fill="${C.dot}"/>`;
      }
    });
    return svg(w, h, label, body, 'viz-groups');
  }

  function groups({ groups: g, size: n }) { return groupsFigure(Array(g).fill(n), `${plural(g, 'group')} of ${n}`); }
  function uneven({ sizes }) { return groupsFigure(sizes, `groups of ${sizes.join(', ')}`); }

  /** rows × cols dots. split: rows from this index on use the second colour. fade: rows from this index on are faded.
      labels: number the rows and columns. */
  function array({ rows, cols, split = null, fade = null, labels = false }) {
    const cell = rows > 8 || cols > 8 ? 20 : 26, rad = cell * 0.3, off = labels ? 30 : 8;
    const w = off + cols * cell + 8, h = off + rows * cell + 8;
    let body = '';
    if (labels) {
      for (let c = 0; c < cols; c++) body += `<text x="${off + c * cell + cell / 2}" y="${off - 10}" text-anchor="middle" font-size="12" fill="${C.line}">${c + 1}</text>`;
      for (let r = 0; r < rows; r++) body += `<text x="${off - 12}" y="${off + r * cell + cell / 2 + 4}" text-anchor="middle" font-size="12" fill="${C.line}">${r + 1}</text>`;
    }
    for (let r = 0; r < rows; r++) {
      const color = fade !== null && r >= fade ? C.faded : split !== null && r >= split ? C.dot2 : C.dot;
      for (let c = 0; c < cols; c++) body += `<circle class="dot${fade !== null && r >= fade ? ' faded' : ''}" cx="${off + c * cell + cell / 2}" cy="${off + r * cell + cell / 2}" r="${rad}" fill="${color}"/>`;
    }
    if (split !== null && split > 0 && split < rows) {
      const y = off + split * cell;
      body += `<line x1="${off - 4}" x2="${off + cols * cell + 4}" y1="${y}" y2="${y}" stroke="${C.line}" stroke-width="2" stroke-dasharray="5 4"/>`;
    }
    return svg(w, h, `array with ${plural(rows, 'row')} of ${cols}`, body, 'viz-array');
  }

  /** Number line from 0 with `jumps` hops of `size`. */
  function jumps({ jumps: n, size }) {
    const total = n * size, x0 = 18, width = 520, unit = (width - 2 * x0) / total, y = 78;
    let body = `<line x1="${x0 - 6}" x2="${width - x0 + 6}" y1="${y}" y2="${y}" stroke="${C.line}" stroke-width="3"/>`;
    for (let k = 0; k <= n; k++) {
      const x = x0 + k * size * unit;
      body += `<line x1="${x}" x2="${x}" y1="${y - 7}" y2="${y + 7}" stroke="${C.line}" stroke-width="2"/><text x="${x}" y="${y + 24}" text-anchor="middle" font-size="14" fill="${C.line}">${k * size}</text>`;
      if (k < n) {
        const x2 = x0 + (k + 1) * size * unit, mid = (x + x2) / 2, top = y - Math.min(46, 16 + (x2 - x) * 0.45);
        body += `<path class="hop" d="M${x} ${y - 4} Q${mid} ${top} ${x2} ${y - 4}" fill="none" stroke="${C.dot}" stroke-width="3"/>`;
        if (x2 - x >= 26) body += `<text x="${mid}" y="${top + 12}" text-anchor="middle" font-size="13" font-weight="700" fill="${C.dot}">+${size}</text>`;
      }
    }
    return svg(width, 112, `number line: ${plural(n, 'jump')} of ${size} from 0 to ${total}`, body, 'viz-jumps');
  }

  /** 4 × 3 = 12 with "factor / factor / product" labels. */
  function equation({ a, b, p }) {
    const part = (v, l, cls) => `<span class="eq-part ${cls}"><b>${v}</b><small>${l}</small></span>`;
    return `<div class="viz-eq" role="img" aria-label="${a} times ${b} equals ${p}: ${a} and ${b} are factors, ${p} is the product">` +
      `${part(a, 'factor', 'f1')}<span class="eq-op">×</span>${part(b, 'factor', 'f2')}<span class="eq-op">=</span>${part(p, 'product', 'pr')}</div>`;
  }

  /** Several pictures side by side, each with a caption. */
  function set({ items }) {
    return `<div class="viz-set">${items.map((it) => `<figure>${render(it.visual)}<figcaption>${esc(it.caption)}</figcaption></figure>`).join('')}</div>`;
  }

  const KINDS = { groups, uneven, array, jumps, equation, set };
  function render(spec) {
    if (!spec) return '';
    const fn = KINDS[spec.kind];
    if (!fn) throw new Error(`unknown visual ${spec.kind}`);
    return fn(spec);
  }

  const api = { render, groups, uneven, array, jumps, equation, set, KINDS };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.GalaxyVisuals = api;
})(this);
