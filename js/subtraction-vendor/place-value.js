/*
 * Mathbook place-value toolkit.
 * Pure helpers (no DOM) so they can be unit-tested in Node and reused by every lesson:
 * digits, number forms, answer parsing, seeded randomness, and SVG base-ten blocks.
 */
(function (root) {
  'use strict';
  const MB = (root.Mathbook = root.Mathbook || {});

  // Left-to-right order of a four-digit number.
  // `label` has soft hyphens so long names can wrap in narrow columns instead of spilling out.
  const PLACES = [
    { key: 'thousands', name: 'Thousands', label: 'Thou­sands', one: 'thousand', value: 1000, block: 'cube', blockName: 'thousand cube' },
    { key: 'hundreds', name: 'Hundreds', label: 'Hun­dreds', one: 'hundred', value: 100, block: 'flat', blockName: 'hundred flat' },
    { key: 'tens', name: 'Tens', label: 'Tens', one: 'ten', value: 10, block: 'rod', blockName: 'ten rod' },
    { key: 'ones', name: 'Ones', label: 'Ones', one: 'one', value: 1, block: 'unit', blockName: 'unit cube' }
  ];

  // ---------- Digits and number forms ----------

  function digitsOf(n) {
    return [Math.floor(n / 1000) % 10, Math.floor(n / 100) % 10, Math.floor(n / 10) % 10, n % 10];
  }

  function fromDigits(d) {
    return d[0] * 1000 + d[1] * 100 + d[2] * 10 + d[3];
  }

  /** 2137 -> "2,137" (independent of the browser locale). */
  function fmt(n) {
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  function expandedTerms(n) {
    return digitsOf(n).map((d, i) => d * PLACES[i].value).filter((v) => v > 0);
  }

  /** 5072 -> "5,000 + 70 + 2" (zero places are left out). */
  function expandedForm(n) {
    return expandedTerms(n).map(fmt).join(' + ');
  }

  const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
    'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

  function under100(n) {
    if (n < 20) return ONES[n];
    return TENS[Math.floor(n / 10)] + (n % 10 ? '-' + ONES[n % 10] : '');
  }

  function under1000(n) {
    const h = Math.floor(n / 100);
    const rest = n % 100;
    const parts = [];
    if (h) parts.push(ONES[h] + ' hundred');
    if (rest) parts.push(under100(rest));
    return parts.join(' ');
  }

  /** 2137 -> "two thousand, one hundred thirty-seven" (0–9,999). */
  function numberToWords(n) {
    if (n === 0) return 'zero';
    const th = Math.floor(n / 1000);
    const rest = n % 1000;
    if (!th) return under1000(rest);
    return ONES[th] + ' thousand' + (rest ? ', ' + under1000(rest) : '');
  }

  // ---------- Answer parsing (generous with formatting, strict with math) ----------

  /** Accepts "2137", "2,137", " 2 137 ". Returns null for anything that is not a whole number. */
  function parseWholeNumber(text) {
    if (text === null || text === undefined) return null;
    const s = String(text).trim().replace(/\s+/g, '');
    if (/^\d+$/.test(s)) return Number(s);
    if (/^\d{1,3}(,\d{3})+$/.test(s)) return Number(s.replace(/,/g, ''));
    return null;
  }

  /**
   * Checks an expanded-form answer such as "5,000 + 70 + 2".
   * Accepted: any spacing, commas optional, any order, and optional "+ 0" terms.
   * Each non-zero term must be one digit times 1, 10, 100, or 1,000, each place used once,
   * and the terms must add to n.
   */
  function checkExpanded(text, n) {
    const parts = String(text || '').split('+');
    const values = parts.map(parseWholeNumber);
    if (!String(text || '').trim() || values.some((v) => v === null)) return { ok: false, reason: 'format' };
    const seen = new Set();
    for (const v of values) {
      if (v === 0) continue;
      const s = String(v);
      if (!/^[1-9]0{0,3}$/.test(s)) return { ok: false, reason: 'term' };
      if (seen.has(s.length)) return { ok: false, reason: 'repeat' };
      seen.add(s.length);
    }
    const sum = values.reduce((a, b) => a + b, 0);
    return sum === n ? { ok: true } : { ok: false, reason: 'sum' };
  }

  // ---------- Seeded randomness (retakes get new numbers; saved attempts stay reproducible) ----------

  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function randInt(r, min, max) {
    return min + Math.floor(r() * (max - min + 1));
  }

  function pick(r, list) {
    return list[Math.floor(r() * list.length)];
  }

  function shuffle(r, list) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /**
   * Random four-digit number.
   * zeros: 'none' (no zero digits), 'one' (exactly one zero in hundreds, tens, or ones), 'maybe' (40% chance of one).
   * distinct: every digit different, so "the 7 in 4,719" is never ambiguous.
   */
  function randomFourDigit(r, opts) {
    const o = Object.assign({ zeros: 'none', distinct: false }, opts);
    for (;;) {
      const d = [randInt(r, 1, 9), randInt(r, 1, 9), randInt(r, 1, 9), randInt(r, 1, 9)];
      if (o.zeros === 'one' || (o.zeros === 'maybe' && r() < 0.4)) d[randInt(r, 1, 3)] = 0;
      if (o.distinct && new Set(d).size < 4) continue;
      return fromDigits(d);
    }
  }

  // ---------- SVG base-ten blocks ----------
  // Every block is its own <g data-block="..."> so tests can count exactly what is drawn.

  const COLORS = {
    cube: { fill: '#9ccaf5', side: '#6fa9de', top: '#c4e0fa', stroke: '#1d5c96' },
    flat: { fill: '#a8e6c0', stroke: '#1c7a45' },
    rod: { fill: '#ffde85', stroke: '#9a7000' },
    unit: { fill: '#ffb8c2', stroke: '#b3304a' }
  };

  function gridLines(x, y, w, h, cols, rows, stroke) {
    let s = '';
    for (let i = 1; i < cols; i++) {
      const xi = (x + (w * i) / cols).toFixed(1);
      s += `<line x1="${xi}" y1="${y}" x2="${xi}" y2="${y + h}"/>`;
    }
    for (let j = 1; j < rows; j++) {
      const yj = (y + (h * j) / rows).toFixed(1);
      s += `<line x1="${x}" y1="${yj}" x2="${x + w}" y2="${yj}"/>`;
    }
    return `<g stroke="${stroke}" stroke-width="0.6" opacity="0.55">${s}</g>`;
  }

  function cube(x, y) {
    const s = 44, d = 12, c = COLORS.cube;
    return `<g data-block="thousand">` +
      `<polygon points="${x},${y + d} ${x + d},${y} ${x + s + d},${y} ${x + s},${y + d}" fill="${c.top}" stroke="${c.stroke}" stroke-width="1.5" stroke-linejoin="round"/>` +
      `<polygon points="${x + s},${y + d} ${x + s + d},${y} ${x + s + d},${y + s} ${x + s},${y + s + d}" fill="${c.side}" stroke="${c.stroke}" stroke-width="1.5" stroke-linejoin="round"/>` +
      `<rect x="${x}" y="${y + d}" width="${s}" height="${s}" fill="${c.fill}" stroke="${c.stroke}" stroke-width="1.5"/>` +
      gridLines(x, y + d, s, s, 10, 10, c.stroke) + `</g>`;
  }

  function flat(x, y) {
    const s = 50, c = COLORS.flat;
    return `<g data-block="hundred"><rect x="${x}" y="${y}" width="${s}" height="${s}" rx="2" fill="${c.fill}" stroke="${c.stroke}" stroke-width="1.5"/>` +
      gridLines(x, y, s, s, 10, 10, c.stroke) + `</g>`;
  }

  function rod(x, y) {
    const w = 12, h = 120, c = COLORS.rod;
    return `<g data-block="ten"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="${c.fill}" stroke="${c.stroke}" stroke-width="1.5"/>` +
      gridLines(x, y, w, h, 1, 10, c.stroke) + `</g>`;
  }

  function unit(x, y) {
    const c = COLORS.unit;
    return `<g data-block="one"><rect x="${x}" y="${y}" width="12" height="12" rx="2" fill="${c.fill}" stroke="${c.stroke}" stroke-width="1.5"/></g>`;
  }

  // Layout per place: blocks per row, cell size, and fixed drawing width (so scale never changes with count).
  const LAYOUT = {
    cube: { draw: cube, perRow: 3, cw: 66, ch: 66, pad: 4 },
    flat: { draw: flat, perRow: 3, cw: 62, ch: 62, pad: 4 },
    rod: { draw: rod, perRow: 9, cw: 20, ch: 128, pad: 4 },
    unit: { draw: unit, perRow: 5, cw: 20, ch: 20, pad: 4 }
  };

  /** SVG for `count` blocks of one place (0–9). `ariaLabel` overrides the spoken description. */
  function placeSVG(placeIndex, count, ariaLabel) {
    const p = PLACES[placeIndex];
    const L = LAYOUT[p.block];
    const rows = Math.max(1, Math.ceil(count / L.perRow));
    const w = L.perRow * L.cw + L.pad;
    const h = rows * L.ch + L.pad;
    let body = '';
    for (let i = 0; i < count; i++) {
      body += L.draw(L.pad + (i % L.perRow) * L.cw, L.pad + Math.floor(i / L.perRow) * L.ch);
    }
    if (!count) {
      body = `<rect x="2" y="2" width="${w - 4}" height="${h - 4}" rx="8" fill="none" stroke="#9fb1c5" stroke-width="2" stroke-dasharray="6 5"/>`;
    }
    const label = ariaLabel || (count === 1 ? `1 ${p.blockName}` : `${count} ${p.blockName}s`);
    return `<svg class="blocks-svg blocks-${p.block}" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${label}">${body}</svg>`;
  }

  /**
   * Base-ten model of a number, one column per place.
   * opts.captions: show "3 tens = 30" under each column (turn off when the student must work it out).
   * opts.dim: array of place indexes to fade (step-by-step demonstrations).
   * opts.digits: draw these counts instead of digitsOf(n) (used by the Build tool).
   */
  function blocksHTML(n, opts) {
    const o = Object.assign({ captions: true, dim: [] }, opts);
    const d = o.digits || digitsOf(n);
    const cols = d.map((count, i) => {
      const p = PLACES[i];
      const cap = o.captions
        ? `<figcaption><b>${count}</b> ${count === 1 ? p.one : p.key} = ${fmt(count * p.value)}</figcaption>`
        : '';
      return `<div class="blocks-col place-${p.key}${o.dim.includes(i) ? ' is-dim' : ''}"><div class="blocks-label">${p.label}</div><div class="blocks-art">${placeSVG(i, count)}</div>${cap}</div>`;
    });
    const summary = d.map((c, i) => `${c} ${c === 1 ? PLACES[i].one : PLACES[i].key}`).join(', ');
    return `<figure class="blocks" aria-label="Base-ten blocks: ${summary}">${cols.join('')}</figure>`;
  }

  /** A single block for vocabulary and "what does this block show?" items. */
  function singleBlockSVG(placeIndex, ariaLabel) {
    return placeSVG(placeIndex, 1, ariaLabel);
  }

  /**
   * Ten-frame: 2 rows of 5 boxes, filled left to right on the top row first (0–10 dots).
   * Each dot is its own <circle data-dot> so tests can count exactly what is drawn.
   */
  function tenFrameSVG(n, ariaLabel) {
    const cell = 44, pad = 6;
    let s = '';
    for (let i = 0; i < 10; i++) {
      const x = pad + (i % 5) * cell, y = pad + Math.floor(i / 5) * cell;
      s += `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" fill="#fff" stroke="#4b3fa8" stroke-width="2"/>`;
      if (i < n) s += `<circle data-dot="1" cx="${x + cell / 2}" cy="${y + cell / 2}" r="15" fill="#f2b705" stroke="#8a6200" stroke-width="2"/>`;
    }
    const label = ariaLabel || `Ten-frame with ${n} ${n === 1 ? 'dot' : 'dots'}`;
    return `<svg class="ten-frame" viewBox="0 0 ${cell * 5 + pad * 2} ${cell * 2 + pad * 2}" width="${cell * 5 + pad * 2}" height="${cell * 2 + pad * 2}" role="img" aria-label="${label}">${s}</svg>`;
  }

  /** Normalizes typed word form: case, hyphens, commas, extra spaces, and "and" do not matter. */
  function normalizeWords(text) {
    return String(text || '').toLowerCase().replace(/[-‐–—]/g, ' ').replace(/[,.]/g, ' ')
      .split(/\s+/).filter((w) => w && w !== 'and').join(' ');
  }

  function checkWords(text, n) {
    return normalizeWords(text) === normalizeWords(numberToWords(n));
  }

  // ---------- Rounding (whole numbers, nearest 10 or 100) ----------

  /** Rounds a nonnegative whole number to the nearest `place` (10 or 100). Halfway rounds up: 125 → 130, 950 → 1,000. */
  function roundTo(n, place) {
    return Math.floor((n + place / 2) / place) * place;
  }

  /** Every whole number that rounds to `target` at `place`: 240 (tens) → [235, 244]; 0 (tens) → [0, 4]. */
  function roundRange(target, place) {
    return [Math.max(0, target - place / 2), target + place / 2 - 1];
  }

  /** The multiples of `place` on either side of n, and the halfway point between them. An exact multiple is its own lower end. */
  function roundEnds(n, place) {
    const lo = Math.floor(n / place) * place;
    return { lo, hi: lo + place, mid: lo + place / 2 };
  }

  /**
   * A number line drawn with HTML (labels stay real text, readable at any width).
   * cfg: { min, max, minor (gap between small ticks), major: [values with a big tick],
   *   below: [{ v, text, cls }] labels under the line, point: { v, text } marked above the line,
   *   go: { from, to } arrow along the line, band: { from, to } shaded stretch, label (accessible description), caption }
   */
  /**
   * Chapter 2 extensions (all optional; a cfg without them draws exactly what it always did):
   *   points: [{ v, text, cls }]  several dots, labels above (alternating below when two are within 12%)
   *   hops:   [{ from, to, text }] arcs above the line (right = solid primary, left = dashed red, label always signed)
   *   open: true, marks: [37, 40, 85]  open line: no scale ticks, a tick and label at each mark, 12% minimum gaps
   *   bands:  [{ from, to, text }] several shaded stretches, each labelled under the line
   */
  function numberLineHTML(cfg) {
    const ext = cfg.points || cfg.hops || cfg.open || cfg.bands;
    if (ext) return numberLineExt(cfg);
    const pos = (v) => ((v - cfg.min) / (cfg.max - cfg.min)) * 100;
    const at = (v) => `left:${pos(v).toFixed(3)}%`;
    // Labels near the ends are aligned inward so they never run off the line.
    const edge = (v) => (pos(v) < 8 ? ' is-start' : pos(v) > 92 ? ' is-end' : '');
    let html = `<figure class="nline"><div class="nline-track" role="img" aria-label="${cfg.label}">`;
    html += `<span class="nline-bar" aria-hidden="true"></span>`;
    if (cfg.band) html += `<span class="nline-band" style="${at(cfg.band.from)};width:${(pos(cfg.band.to) - pos(cfg.band.from)).toFixed(3)}%" aria-hidden="true"></span>`;
    if (cfg.minor) for (let v = cfg.min; v <= cfg.max; v += cfg.minor) html += `<span class="nline-tick" style="${at(v)}" aria-hidden="true"></span>`;
    (cfg.major || []).forEach((v) => { html += `<span class="nline-tick is-major" style="${at(v)}" aria-hidden="true"></span>`; });
    if (cfg.go && cfg.go.from !== cfg.go.to) {
      const a = Math.min(cfg.go.from, cfg.go.to), b = Math.max(cfg.go.from, cfg.go.to);
      html += `<span class="nline-go ${cfg.go.to > cfg.go.from ? 'is-up' : 'is-down'}" style="${at(a)};width:${(pos(b) - pos(a)).toFixed(3)}%" aria-hidden="true"></span>`;
    }
    if (cfg.point) html += `<span class="nline-dot" style="${at(cfg.point.v)}" aria-hidden="true"></span><span class="nline-point${edge(cfg.point.v)}" style="${at(cfg.point.v)}" aria-hidden="true">${cfg.point.text}</span>`;
    (cfg.below || []).forEach((l) => { html += `<span class="nline-label${edge(l.v)} ${l.cls || ''}" style="${at(l.v)}" aria-hidden="true">${l.text}</span>`; });
    html += `</div>${cfg.caption ? `<figcaption class="nline-caption">${cfg.caption}</figcaption>` : ''}</figure>`;
    return html;
  }

  function escText(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  /** Number line with several points, hop arcs, an open (unscaled) layout, or several bands. */
  function numberLineExt(cfg) {
    let pos;
    const marks = cfg.open ? (cfg.marks || []).slice().sort((a, b) => a - b) : null;
    if (cfg.open && marks.length >= 2) {
      // Proportional positions inside 4%–96%, stretched so neighbouring marks are at least 12% apart (the line is a sketch).
      const span = marks[marks.length - 1] - marks[0] || 1;
      const raw = marks.slice(1).map((m, i) => ((m - marks[i]) / span) * 92);
      // cfg.minGap (percent, optional): wider spacing for 3-digit labels on a phone (2-9 counting up); 12 by default.
      const minGap = Math.min(cfg.minGap || 12, 92 / raw.length);
      // Short gaps are stretched to exactly the minimum; the rest share what is left in proportion.
      const fixed = raw.map((g) => g < minGap);
      let gaps = raw;
      for (let k = 0; k <= raw.length; k++) {
        const free = raw.reduce((a, g, i) => a + (fixed[i] ? 0 : g), 0);
        const room = 92 - minGap * fixed.filter(Boolean).length;
        gaps = raw.map((g, i) => (fixed[i] ? minGap : (g * room) / (free || 1)));
        const more = gaps.map((g, i) => !fixed[i] && g < minGap);
        if (!more.some(Boolean)) break;
        more.forEach((m, i) => { if (m) fixed[i] = true; });
      }
      const P = [4];
      gaps.forEach((g) => P.push(P[P.length - 1] + g));
      pos = (v) => {
        if (v <= marks[0]) return P[0];
        for (let i = 1; i < marks.length; i++) if (v <= marks[i]) return P[i - 1] + ((v - marks[i - 1]) / ((marks[i] - marks[i - 1]) || 1)) * (P[i] - P[i - 1]);
        return P[P.length - 1];
      };
    } else {
      const min = cfg.min !== undefined ? cfg.min : (marks ? marks[0] - 1 : 0);
      const max = cfg.max !== undefined ? cfg.max : (marks ? marks[0] + 1 : 100);
      pos = (v) => ((v - min) / (max - min)) * 100;
    }
    const at = (v) => `left:${pos(v).toFixed(3)}%`;
    const edge = (v) => (pos(v) < 8 ? ' is-start' : pos(v) > 92 ? ' is-end' : '');
    const hops = cfg.hops || [];
    // Hop arcs: height grows with length; labels of close neighbours are nudged up so they never overlap.
    const H = hops.map((j) => {
      const x1 = pos(j.from), x2 = pos(j.to);
      const left = j.to < j.from;
      let text = String(j.text !== undefined ? j.text : (left ? '−' : '+') + fmt(Math.abs(j.to - j.from)));
      if (left && !/^[−-]/.test(text)) text = '−' + text;
      return { x1, x2, mid: (x1 + x2) / 2, h: 24 + Math.min(34, Math.abs(x2 - x1) * 0.6), left, text, nudge: 0 };
    });
    const byMid = H.slice().sort((a, b) => a.mid - b.mid);
    for (let i = 1; i < byMid.length; i++) {
      const p = byMid[i - 1], c = byMid[i];
      if (Math.abs(c.mid - p.mid) < 14 && Math.abs((c.h + c.nudge) - (p.h + p.nudge)) < 26) c.nudge = p.h + p.nudge - c.h + 28;
    }
    const layer = H.length ? Math.max(...H.map((j) => j.h + j.nudge + 30)) + 2 : 0;
    const bandText = (cfg.bands || []).some((b) => b.text);
    const pointsBelow = H.length > 0;
    let label = cfg.label;
    if (!label) {
      const words = [];
      if (cfg.open && H.length) words.push(`Number line: from ${fmt(hops[0].from)} ` + hops.map((j, i) => `${i ? 'then ' : ''}jump ${H[i].text} to ${fmt(j.to)}`).join(', ') + '.');
      else words.push(cfg.open ? `Number line with ${marks.map(fmt).join(', ')}.` : `Number line from ${fmt(cfg.min)} to ${fmt(cfg.max)}.`);
      if (!(cfg.open && H.length) && H.length) words.push(hops.map((j, i) => `Jump ${H[i].text} from ${fmt(j.from)} to ${fmt(j.to)}.`).join(' '));
      (cfg.points || []).forEach((p) => words.push(`Point ${p.text} at ${fmt(p.v)}.`));
      (cfg.bands || []).forEach((b) => words.push(`From ${fmt(b.from)} to ${fmt(b.to)}${b.text ? ': ' + b.text : ''}.`));
      label = words.join(' ');
    }
    let html = `<figure class="nline nline-x${bandText ? ' has-bandtext' : ''}"${layer > 40 ? ` style="padding-top:${layer - 40}px"` : ''}><div class="nline-track" role="img" aria-label="${escText(label)}">`;
    html += `<span class="nline-bar" aria-hidden="true"></span>`;
    (cfg.bands || []).concat(cfg.band ? [cfg.band] : []).forEach((b) => {
      html += `<span class="nline-band" style="${at(b.from)};width:${(pos(b.to) - pos(b.from)).toFixed(3)}%" aria-hidden="true"></span>`;
      if (b.text) html += `<span class="nline-bandtext" style="left:${((pos(b.from) + pos(b.to)) / 2).toFixed(3)}%" aria-hidden="true">${escText(b.text)}</span>`;
    });
    if (!cfg.open && cfg.minor) for (let v = cfg.min; v <= cfg.max; v += cfg.minor) html += `<span class="nline-tick" style="${at(v)}" aria-hidden="true"></span>`;
    (cfg.open ? marks : (cfg.major || [])).forEach((v) => { html += `<span class="nline-tick is-major" style="${at(v)}" aria-hidden="true"></span>`; });
    // Open-line marks sit at 4%–96%, so their labels stay centred under the tick (the line's side padding holds them).
    if (cfg.open) marks.forEach((v) => { html += `<span class="nline-label" style="${at(v)}" aria-hidden="true">${fmt(v)}</span>`; });
    (cfg.below || []).forEach((l) => { html += `<span class="nline-label${edge(l.v)} ${l.cls || ''}" style="${at(l.v)}" aria-hidden="true">${l.text}</span>`; });
    // Points: labels above the line (below when hops use the space above); close neighbours alternate.
    const pts = (cfg.points || []).slice().sort((a, b) => a.v - b.v);
    let flip = false;
    pts.forEach((p, i) => {
      flip = i > 0 && Math.abs(pos(p.v) - pos(pts[i - 1].v)) < 12 ? !flip : false;
      const below = pointsBelow !== flip;
      html += `<span class="nline-pt" style="${at(p.v)}" aria-hidden="true"></span>` +
        `<span class="nline-ptlabel${below ? ' is-below' : ''}${edge(p.v)} ${p.cls || ''}" style="${at(p.v)}" aria-hidden="true">${escText(p.text !== undefined ? p.text : fmt(p.v))}</span>`;
    });
    if (cfg.point) html += `<span class="nline-dot" style="${at(cfg.point.v)}" aria-hidden="true"></span><span class="nline-point${edge(cfg.point.v)}" style="${at(cfg.point.v)}" aria-hidden="true">${cfg.point.text}</span>`;
    if (H.length) {
      html += `<span class="nline-hops" style="height:${layer}px" aria-hidden="true"><svg viewBox="0 0 100 ${layer}" preserveAspectRatio="none" focusable="false">` +
        H.map((j) => `<path d="M${j.x1.toFixed(2)} ${layer} Q${j.mid.toFixed(2)} ${(layer - 2 * j.h).toFixed(1)} ${j.x2.toFixed(2)} ${layer}" class="${j.left ? 'is-left' : 'is-right'}" vector-effect="non-scaling-stroke"/>`).join('') + `</svg>` +
        H.map((j) => `<span class="nline-hophead ${j.left ? 'is-left' : 'is-right'}" style="left:${j.x2.toFixed(3)}%"></span>` +
          `<span class="nline-hoplabel ${j.left ? 'is-left' : 'is-right'}" style="left:${j.mid.toFixed(3)}%;top:${(layer - j.h - j.nudge - 28).toFixed(1)}px">${escText(j.text)}</span>`).join('') + `</span>`;
    }
    html += `</div>${cfg.caption ? `<figcaption class="nline-caption">${cfg.caption}</figcaption>` : ''}</figure>`;
    return html;
  }

  /**
   * The rounding number line for n at `place`. show: 'ends' (the two multiples), 'mid' (+ halfway), 'point' (+ n plotted), 'all' (+ which way it rounds).
   */
  function roundLineHTML(n, place, show) {
    const { lo, hi, mid } = roundEnds(n, place);
    const r = roundTo(n, place);
    const word = place === 10 ? 'ten' : 'hundred';
    const below = [{ v: lo, text: fmt(lo), cls: 'is-end-label' + (show === 'all' && r === lo ? ' is-answer' : '') },
      { v: hi, text: fmt(hi), cls: 'is-end-label' + (show === 'all' && r === hi ? ' is-answer' : '') }];
    if (show !== 'ends') below.push({ v: mid, text: fmt(mid), cls: 'is-mid' });
    const parts = [`${fmt(lo)} and ${fmt(hi)} are the ${word}s around ${fmt(n)}`];
    if (show !== 'ends') parts.push(`halfway is ${fmt(mid)}`);
    if (show === 'all') parts.push(`${fmt(n)} rounds to ${fmt(r)}`);
    return numberLineHTML({
      min: lo, max: hi, minor: place / 10, major: show === 'ends' ? [lo, hi] : [lo, mid, hi], below,
      point: show === 'point' || show === 'all' ? { v: n, text: fmt(n) } : null, go: show === 'all' ? { from: n, to: r } : null,
      label: `Number line from ${fmt(lo)} to ${fmt(hi)} by ${place / 10 === 1 ? 'ones' : 'tens'}: ` + parts.join(', ') + '.',
      caption: show === 'all' ? `<b>${fmt(n)}</b> is closer to <b>${fmt(r)}</b>, so it rounds to <b>${fmt(r)}</b> (nearest ${word}).` : ''
    });
  }

  MB.pv = {
    normalizeWords, checkWords, tenFrameSVG,
    PLACES, digitsOf, fromDigits, fmt, expandedTerms, expandedForm, numberToWords,
    parseWholeNumber, checkExpanded, rng, randInt, pick, shuffle, randomFourDigit,
    placeSVG, blocksHTML, singleBlockSVG,
    roundTo, roundRange, roundEnds, numberLineHTML, roundLineHTML, escText
  };
})(typeof window !== 'undefined' ? window : globalThis);
