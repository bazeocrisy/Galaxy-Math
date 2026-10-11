/* Galaxy Math pictures: equal groups, arrays, number-line jumps and labelled equations, drawn as inline SVG/HTML
   strings from small spec objects ({ kind: 'array', rows: 3, cols: 4 }). Pure functions (window.GalaxyVisuals / Node). */
(function (root) {
  'use strict';

  const C = { dot: '#6A35D9', dot2: '#D9366F', ring: '#2B8DBE', ringFill: '#E3F3FF', line: '#1B1F4B', faded: '#B9B3D6' };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const plural = (n, w) => `${n} ${n === 1 ? w : w + 's'}`;

  function svg(w, h, label, body, cls = '') {
    // --w lets the layout enlarge a picture in proportion to its natural size (small pictures never balloon).
    return `<svg class="viz ${cls}" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" style="--w:${w}px" role="img" aria-label="${esc(label)}">${body}</svg>`;
  }

  /** Dots arranged in a small grid inside one circle; sizes[i] dots in group i. */
  function groupsFigure(sizes, label) {
    const g = groupsBody(sizes, 0, 0);
    return svg(g.w, g.h, label, g.body, 'viz-groups');
  }
  /** The circles of groupsFigure drawn at (x0, y0); returns { body, w, h }. */
  function groupsBody(sizes, x0, y0, cls = 'grp') {
    const max = Math.max(1, ...sizes);
    const cols = Math.ceil(Math.sqrt(max)), rows = Math.ceil(max / cols);
    const cell = 15, r = Math.max(26, Math.ceil(Math.hypot(cols * cell, rows * cell) / 2) + 7);
    const gap = 12, per = Math.min(5, sizes.length), lines = Math.ceil(sizes.length / per);
    const w = per * (2 * r + gap) + gap, h = lines * (2 * r + gap) + gap;
    let body = '';
    sizes.forEach((n, i) => {
      const cx = x0 + gap + r + (i % per) * (2 * r + gap), cy = y0 + gap + r + Math.floor(i / per) * (2 * r + gap);
      body += `<circle class="${cls}" cx="${cx}" cy="${cy}" r="${r}" fill="${C.ringFill}" stroke="${C.ring}" stroke-width="3"/>`;
      const c2 = Math.ceil(Math.sqrt(n)) || 1, r2 = Math.ceil(n / c2);
      for (let k = 0; k < n; k++) {
        const x = cx - ((c2 - 1) * cell) / 2 + (k % c2) * cell, y = cy - ((r2 - 1) * cell) / 2 + Math.floor(k / c2) * cell;
        body += `<circle class="dot" cx="${x}" cy="${y}" r="5.5" fill="${C.dot}"/>`;
      }
    });
    return { body, w, h };
  }

  function groups({ groups: g, size: n }) { return groupsFigure(Array(g).fill(n), `${plural(g, 'group')} of ${n}`); }
  function uneven({ sizes }) { return groupsFigure(sizes, `groups of ${sizes.join(', ')}`); }

  /** rows × cols dots. split: rows from this index on use the second colour. fade: rows from this index on are faded.
      labels: number the rows and columns. */
  function array({ rows, cols, split = null, fade = null, labels = false }) {
    const cell = rows > 8 || cols > 8 ? 20 : rows > 5 || cols > 6 ? 26 : 34, rad = cell * 0.3, off = labels ? 30 : 8;
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

  /** Number line from 0 with `jumps` hops of `size`. labels: false hides the landing numbers (used in questions,
      so the picture never shows the total before the child answers). */
  function jumps({ jumps: n, size, labels = true }) {
    // Fewer jumps → a narrower picture, so labels stay readable when it is shrunk to fit a phone.
    const total = n * size, x0 = 18, width = Math.max(240, Math.min(520, 60 + n * 80)), unit = (width - 2 * x0) / total, y = 78;
    const big = n >= 6, fs1 = big ? 22 : 16, fs2 = big ? 20 : 15;   // many jumps → bigger text, still readable on a phone
    let body = `<line x1="${x0 - 6}" x2="${width - x0 + 6}" y1="${y}" y2="${y}" stroke="${C.line}" stroke-width="3"/>`;
    for (let k = 0; k <= n; k++) {
      const x = x0 + k * size * unit;
      body += `<line x1="${x}" x2="${x}" y1="${y - 7}" y2="${y + 7}" stroke="${C.line}" stroke-width="2"/>` +
        (labels || k === 0 ? `<text x="${x}" y="${y + 24}" text-anchor="middle" font-size="${fs1}" fill="${C.line}">${k * size}</text>` : '');
      if (k < n) {
        const x2 = x0 + (k + 1) * size * unit, mid = (x + x2) / 2, top = y - Math.min(46, 16 + (x2 - x) * 0.45);
        body += `<path class="hop" d="M${x} ${y - 4} Q${mid} ${top} ${x2} ${y - 4}" fill="none" stroke="${C.dot}" stroke-width="3"/>`;
        if (x2 - x >= 26) body += `<text x="${mid}" y="${top + 12}" text-anchor="middle" font-size="${fs2}" font-weight="700" fill="${C.dot}">+${size}</text>`;
      }
    }
    return svg(width, 112, labels ? `number line: ${plural(n, 'jump')} of ${size} from 0 to ${total}` : `number line: ${plural(n, 'jump')} of ${size} from 0`, body, 'viz-jumps');
  }

  /** Bar model for "times as many": one bar of `size` for the first person, `times` equal bars for the second.
      The total is never written, so it can be used as a hint. */
  function compare({ times, size, names = ['Mia', 'Ben'] }) {
    const box = 40, h = 30, labelW = 64, gap = 16, w = labelW + times * box + 8;
    const row = (y, n, color) => Array.from({ length: n }, (_, i) =>
      `<rect class="bar-box" x="${labelW + i * box}" y="${y}" width="${box - 2}" height="${h}" rx="5" fill="${color}"/><text x="${labelW + i * box + (box - 2) / 2}" y="${y + h / 2 + 5}" text-anchor="middle" font-size="14" font-weight="700" fill="#fff">${size}</text>`).join('');
    const body = `<text x="0" y="${8 + h / 2 + 5}" font-size="14" font-weight="700" fill="${C.line}">${esc(names[0])}</text>${row(8, 1, C.ring)}` +
      `<text x="0" y="${8 + h + gap + h / 2 + 5}" font-size="14" font-weight="700" fill="${C.line}">${esc(names[1])}</text>${row(8 + h + gap, times, C.dot)}`;
    return svg(w, 8 + 2 * h + gap + 8, `bar model: ${names[0]} has 1 bar of ${size}; ${names[1]} has ${times} bars of ${size}`, body, 'viz-compare');
  }

  /* ---------------- division pictures ---------------- */
  /** n dots in rows of 10 (a small gap after 5), so a child can count them by fives and tens. */
  function pileBody(n, x0, y0, cls = 'dot pile') {
    const cell = 16, per = 10, mid = 8;
    let body = '';
    for (let k = 0; k < n; k++) {
      const c = k % per, row = Math.floor(k / per);
      body += `<circle class="${cls}" cx="${x0 + 10 + c * cell + (c >= 5 ? mid : 0)}" cy="${y0 + 10 + row * cell}" r="5.5" fill="${C.dot}"/>`;
    }
    return { body, w: Math.min(n, per) * cell + (n > 5 ? mid : 0) + 6, h: Math.ceil(n / per) * cell + 6 };
  }
  /** Equal sharing: what is left of the pile on top, `groups` plates below holding `dealt` each (dealt 0 = empty plates). */
  function share({ total, groups: g, dealt = 0 }) {
    const left = total - g * dealt;
    const pile = left > 0 ? pileBody(left, 0, 0) : { body: '', w: 0, h: 0 };
    const plates = groupsBody(Array(g).fill(dealt), 0, pile.h + (pile.h ? 6 : 0), 'grp plate');
    const w = Math.max(pile.w, plates.w), h = pile.h + (pile.h ? 6 : 0) + plates.h;
    const label = dealt ? `${total} shared into ${g} equal groups: ${dealt} in each group so far, ${left} left` : `${total} to share equally into ${g} groups`;
    return svg(w, h, label, pile.body + plates.body, 'viz-share');
  }
  /** Equal grouping: the first `circled` groups of `size` are circled; the rest of the pile is still loose. */
  function grouping({ total, size, circled = 0 }) {
    const cell = 16, cols = Math.min(size, 5), rowsIn = Math.ceil(size / 5), gw = cols * cell + 12, gh = rowsIn * cell + 12, gap = 10, per = 5;
    let body = '', w = 0, h = 0;
    for (let i = 0; i < circled; i++) {
      const x = (i % per) * (gw + gap), y = Math.floor(i / per) * (gh + gap);
      body += `<rect class="ring" x="${x + 1}" y="${y + 1}" width="${gw - 2}" height="${gh - 2}" rx="12" fill="${C.ringFill}" stroke="${C.ring}" stroke-width="3"/>`;
      for (let k = 0; k < size; k++) body += `<circle class="dot" cx="${x + 14 + (k % 5) * cell}" cy="${y + 14 + Math.floor(k / 5) * cell}" r="5.5" fill="${C.dot}"/>`;
      w = Math.max(w, x + gw); h = Math.max(h, y + gh);
    }
    const left = total - circled * size;
    const pile = pileBody(left, 0, h ? h + 8 : 0);
    body += pile.body;
    return svg(Math.max(w, pile.w, 40), (h ? h + 8 : 0) + pile.h, circled ? `${total} in groups of ${size}: ${circled} groups circled, ${left} left` : `${total} things`, body, 'viz-share');
  }
  /** Repeated subtraction: a number line from 0 to the total, with `shown` jumps of `size` going back from the total. */
  function jumpsBack({ jumps: n, size, labels = true, shown = n }) {
    const total = n * size, x0 = 18, width = Math.max(260, Math.min(520, 60 + n * 80)), unit = (width - 2 * x0) / total, y = 78;
    const big = n >= 6, fs1 = big ? 22 : 16, fs2 = big ? 20 : 15;
    let body = `<line x1="${x0 - 6}" x2="${width - x0 + 6}" y1="${y}" y2="${y}" stroke="${C.line}" stroke-width="3"/>`;
    for (let k = 0; k <= n; k++) {
      const x = x0 + k * size * unit;
      body += `<line x1="${x}" x2="${x}" y1="${y - 7}" y2="${y + 7}" stroke="${C.line}" stroke-width="2"/>`;
      if (labels || k === n) body += `<text x="${x}" y="${y + 24}" text-anchor="middle" font-size="${fs1}" fill="${C.line}">${k * size}</text>`;
    }
    for (let j = 0; j < shown; j++) {   // jump j goes from (n − j) × size back to (n − j − 1) × size
      const xa = x0 + (n - j) * size * unit, xb = x0 + (n - j - 1) * size * unit, mid = (xa + xb) / 2, top = y - Math.min(46, 16 + (xa - xb) * 0.45);
      body += `<path class="hop back" d="M${xa} ${y - 4} Q${mid} ${top} ${xb} ${y - 4}" fill="none" stroke="${C.dot2}" stroke-width="3"/>`;
      body += `<path d="M${xb} ${y - 4} l7 -6 l1 8 z" fill="${C.dot2}"/>`;
      if (xa - xb >= 26) body += `<text x="${mid}" y="${top + 12}" text-anchor="middle" font-size="${fs2}" font-weight="700" fill="${C.dot2}">−${size}</text>`;
    }
    return svg(width, 112, `number line from ${total} back to 0: ${plural(shown, 'jump')} of ${size} shown`, body, 'viz-jumps');
  }
  /** Long-division bracket: divisor outside, dividend under the bar, quotient on top. labels: name each part. */
  function bracket({ dividend, divisor, quotient = null, labels = false }) {
    const dw = String(dividend).length * 24, x0 = 76, top = 52, base = 98, w = x0 + 16 + dw + (labels ? 96 : 24), h = labels ? 132 : 112;
    let body = `<text x="${x0 - 12}" y="${base}" text-anchor="end" font-size="40" font-weight="700" fill="${C.line}">${divisor}</text>`;
    body += `<path d="M${x0} ${top} C${x0 + 13} ${top + 16}, ${x0 + 13} ${base - 6}, ${x0} ${base + 10}" fill="none" stroke="${C.line}" stroke-width="4" stroke-linecap="round"/>`;
    body += `<line x1="${x0}" x2="${x0 + 20 + dw}" y1="${top}" y2="${top}" stroke="${C.line}" stroke-width="4" stroke-linecap="round"/>`;
    body += `<text x="${x0 + 16 + dw}" y="${base}" text-anchor="end" font-size="40" font-weight="700" fill="${C.line}">${dividend}</text>`;
    if (quotient !== null) body += `<text x="${x0 + 16 + dw}" y="${top - 10}" text-anchor="end" font-size="36" font-weight="700" fill="${C.dot}">${quotient}</text>`;
    if (labels) {
      body += `<text x="${x0 - 12}" y="${base + 26}" text-anchor="end" font-size="14" font-weight="700" fill="${C.dot2}">divisor</text>`;
      body += `<text x="${x0 + 16 + dw}" y="${base + 26}" text-anchor="end" font-size="14" font-weight="700" fill="${C.dot2}">dividend</text>`;
      if (quotient !== null) body += `<text x="${x0 + 26 + dw}" y="${top - 14}" font-size="14" font-weight="700" fill="${C.dot}">← quotient</text>`;
    }
    const label = `long division bracket: ${divisor} outside, ${dividend} inside${quotient !== null ? `, ${quotient} on top` : ''}. It means ${dividend} ÷ ${divisor}${quotient !== null ? ` = ${quotient}` : ''}.`;
    return svg(w, h, label, body, 'viz-bracket');
  }
  /** 24 ÷ 6 = 4 with "dividend / divisor / quotient" labels. */
  function divEquation({ p, d, q }) {
    const part = (val, l, cls) => `<span class="eq-part ${cls}"><b>${val}</b><small>${l}</small></span>`;
    return `<div class="viz-eq" role="img" aria-label="${p} divided by ${d} equals ${q}: ${p} is the dividend, ${d} is the divisor, ${q} is the quotient">` +
      `${part(p, 'dividend', 'f1')}<span class="eq-op">÷</span>${part(d, 'divisor', 'f2')}<span class="eq-op">=</span>${part(q, 'quotient', 'pr')}</div>`;
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

  const KINDS = { groups, uneven, array, jumps, equation, set, compare, share, grouping, jumpsBack, bracket, divEquation };
  function render(spec) {
    if (!spec) return '';
    const fn = KINDS[spec.kind];
    if (!fn) throw new Error(`unknown visual ${spec.kind}`);
    return fn(spec);
  }

  const api = { render, groups, uneven, array, jumps, equation, set, compare, share, grouping, jumpsBack, bracket, divEquation, KINDS };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.GalaxyVisuals = api;
})(this);
