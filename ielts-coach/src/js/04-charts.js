/* ---------- Writing Task 1 charts (SVG/HTML from JSON specs) ---------- */
const SERIES = ['var(--s1)', 'var(--s2)', 'var(--s3)', 'var(--s4)', 'var(--s5)', 'var(--s6)'];
const ON_SERIES = ['#ffffff', '#ffffff', '#13202f', '#13202f', '#13202f', '#ffffff'];

function niceStep(span, count = 5) {
  const raw = span / count;
  const mag = 10 ** Math.floor(Math.log10(raw || 1));
  const n = raw / mag;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * mag;
}
const fmtNum = (v) => (v == null ? '–' : Number.isInteger(v) ? String(v) : String(+v.toFixed(2)));
function wrapLabel(text, maxChars) {
  const words = String(text).split(/\s+/); const lines = []; let cur = '';
  words.forEach((w) => { if ((cur + ' ' + w).trim().length > maxChars && cur) { lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); });
  if (cur) lines.push(cur);
  return lines.slice(0, 3);
}
function legendHtml(series, kind) {
  if (series.length < 2) return '';
  return `<div class="legend">${series.map((s, i) => `<span><i class="${kind === 'line' ? 'line' : ''}" style="background:${SERIES[i]}"></i>${esc(s.name)}</span>`).join('')}</div>`;
}
function dataTableHtml(headers, rows) {
  return `<details><summary class="small">Show the data as a table</summary><div class="table-wrap"><table class="data-table"><thead><tr>${headers.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></details>`;
}

function axisFrame({ W, H, m, yMin, yMax, unit, yLabel }) {
  const step = niceStep(yMax - yMin, 5);
  const top = Math.ceil(yMax / step - 1e-9) * step;
  const y = (v) => m.t + (H - m.t - m.b) * (1 - (v - yMin) / (top - yMin));
  let g = '';
  for (let v = yMin; v <= top + 1e-9; v += step) {
    const yy = y(v).toFixed(1);
    g += `<line x1="${m.l}" x2="${W - m.r}" y1="${yy}" y2="${yy}" stroke="var(--grid)" stroke-width="1"/>`;
    g += `<text x="${m.l - 8}" y="${yy}" text-anchor="end" dominant-baseline="middle" font-size="12">${fmtNum(+v.toFixed(4))}${unit === '%' ? '%' : ''}</text>`;
  }
  g += `<line x1="${m.l}" x2="${W - m.r}" y1="${y(yMin)}" y2="${y(yMin)}" stroke="var(--axis)" stroke-width="1"/>`;
  if (yLabel) g += `<text x="4" y="12" font-size="12" class="axis-label">${esc(yLabel)}</text>`;
  return { g, y, top };
}

const compactChart = () => typeof window !== 'undefined' && window.innerWidth < 640;
function lineChart(c) {
  const cp = compactChart();
  const W = cp ? 360 : 640, H = cp ? 280 : 360, m = { l: cp ? 44 : 56, r: cp ? 12 : 20, t: 28, b: 36 };
  const yMin = c.yMin ?? 0;
  const { g, y } = axisFrame({ W, H, m, yMin, yMax: c.yMax, unit: c.unit, yLabel: c.yLabel });
  const n = c.xLabels.length;
  const x = (i) => m.l + (W - m.l - m.r) * (n === 1 ? 0.5 : i / (n - 1));
  let s = g;
  const maxLabels = cp ? 5 : 8;
  const every = n > maxLabels + 1 ? Math.ceil(n / maxLabels) : 1;
  c.xLabels.forEach((lab, i) => { if (i % every === 0 || i === n - 1) s += `<text x="${x(i)}" y="${H - m.b + 20}" text-anchor="middle" font-size="12">${esc(lab)}</text>`; });
  c.series.forEach((ser, si) => {
    let d = ''; let pen = false;
    ser.values.forEach((v, i) => { if (v == null) { pen = false; return; } d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)} `; pen = true; });
    s += `<path d="${d}" fill="none" stroke="${SERIES[si]}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`;
    ser.values.forEach((v, i) => { if (v != null) s += `<circle cx="${x(i)}" cy="${y(v)}" r="4" fill="${SERIES[si]}" stroke="var(--sheet)" stroke-width="2"><title>${esc(ser.name)}, ${esc(c.xLabels[i])}: ${fmtNum(v)}${c.unit === '%' ? '%' : ''}</title></circle>`; });
  });
  const rows = c.xLabels.map((lab, i) => [lab, ...c.series.map((ser) => fmtNum(ser.values[i]) + (c.unit === '%' && ser.values[i] != null ? '%' : ''))]);
  return `<div class="chart">${c.title ? `<div class="chart-title">${esc(c.title)}</div>` : ''}${legendHtml(c.series, 'line')}<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(c.title || 'Line graph')}">${s}</svg>${dataTableHtml(['', ...c.series.map((x2) => x2.name)], rows)}</div>`;
}

function barPath(x, y, w, h, r = 4) {
  if (h <= 0) return '';
  r = Math.min(r, w / 2, h);
  return `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`;
}
function barChart(c) {
  const cp = compactChart();
  const W = cp ? 360 : 640, H = cp ? 320 : 380, m = { l: cp ? 44 : 56, r: cp ? 8 : 16, t: 28, b: 64 };
  const { g, y } = axisFrame({ W, H, m, yMin: 0, yMax: c.yMax, unit: c.unit, yLabel: c.yLabel });
  const n = c.categories.length, k = c.series.length;
  const band = (W - m.l - m.r) / n;
  const bw = Math.min(cp ? 16 : 24, (band * 0.76 - (k - 1) * 2) / k);
  const gw = bw * k + (k - 1) * 2;
  let s = g;
  c.categories.forEach((cat, ci) => {
    const x0 = m.l + band * ci + (band - gw) / 2;
    c.series.forEach((ser, si) => {
      const v = ser.values[ci]; if (v == null) return;
      const top = y(v), base = y(0);
      s += `<path d="${barPath(x0 + si * (bw + 2), top, bw, base - top)}" fill="${SERIES[si]}"><title>${esc(cat)}, ${esc(ser.name)}: ${fmtNum(v)}${c.unit === '%' ? '%' : ''}</title></path>`;
    });
    wrapLabel(cat, Math.max(6, Math.floor(band / (cp ? 6 : 7)))).forEach((line, li) => {
      s += `<text x="${m.l + band * ci + band / 2}" y="${H - m.b + 18 + li * 13}" text-anchor="middle" font-size="${cp ? 10.5 : 12}">${esc(line)}</text>`;
    });
  });
  const rows = c.categories.map((cat, i) => [cat, ...c.series.map((ser) => fmtNum(ser.values[i]) + (c.unit === '%' && ser.values[i] != null ? '%' : ''))]);
  return `<div class="chart">${c.title ? `<div class="chart-title">${esc(c.title)}</div>` : ''}${legendHtml(c.series, 'bar')}<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(c.title || 'Bar chart')}">${s}</svg>${dataTableHtml(['', ...c.series.map((x2) => x2.name)], rows)}</div>`;
}

function pieChart(c) {
  const one = (p) => {
    const R = 90, C = 100; let a0 = -Math.PI / 2; let s = '';
    const total = sum(p.slices.map((x) => x.value)) || 100;
    p.slices.forEach((sl, i) => {
      const a1 = a0 + (sl.value / total) * Math.PI * 2;
      const large = a1 - a0 > Math.PI ? 1 : 0;
      const p0 = [C + R * Math.cos(a0), C + R * Math.sin(a0)], p1 = [C + R * Math.cos(a1), C + R * Math.sin(a1)];
      s += `<path d="M${C},${C} L${p0[0].toFixed(2)},${p0[1].toFixed(2)} A${R},${R} 0 ${large} 1 ${p1[0].toFixed(2)},${p1[1].toFixed(2)} Z" fill="${SERIES[i % 6]}" stroke="var(--sheet)" stroke-width="2"><title>${esc(sl.label)}: ${fmtNum(sl.value)}%</title></path>`;
      if (sl.value >= 7) {
        const mid = (a0 + a1) / 2;
        s += `<text x="${(C + R * 0.62 * Math.cos(mid)).toFixed(1)}" y="${(C + R * 0.62 * Math.sin(mid)).toFixed(1)}" text-anchor="middle" dominant-baseline="middle" font-size="13" font-weight="700" style="fill:${ON_SERIES[i % 6]}">${fmtNum(sl.value)}%</text>`;
      }
      a0 = a1;
    });
    return `<div class="pie-one"><div class="chart-title">${esc(p.title || '')}</div><svg viewBox="0 0 200 200" style="max-width:220px" role="img" aria-label="${esc(p.title || 'Pie chart')}">${s}</svg>
      <div class="pie-legend">${p.slices.map((sl, i) => `<span><i style="background:${SERIES[i % 6]}"></i>${esc(sl.label)}<b class="mono">${fmtNum(sl.value)}%</b></span>`).join('')}</div></div>`;
  };
  return `<div class="chart">${c.title ? `<div class="chart-title">${esc(c.title)}</div>` : ''}<div class="pies">${c.pies.map(one).join('')}</div></div>`;
}

function tableChart(c) {
  return `<div class="chart">${c.title ? `<div class="chart-title">${esc(c.title)}</div>` : ''}<div class="table-wrap"><table class="data-table"><thead><tr>${c.columns.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${c.rows.map((r) => `<tr>${r.map((v, i) => (i === 0 ? `<th>${esc(v)}</th>` : `<td>${esc(v)}</td>`)).join('')}</tr>`).join('')}</tbody></table></div>${c.note ? `<div class="xs faint">${esc(c.note)}</div>` : ''}</div>`;
}

function processChart(c) {
  const steps = c.steps.map((st, i) => `<div class="p-step"><b>Stage ${i + 1}</b><span><strong>${esc(st.label)}</strong></span>${st.detail ? `<span class="faint">${esc(st.detail)}</span>` : ''}</div>`);
  return `<div class="chart">${c.title ? `<div class="chart-title">${esc(c.title)}</div>` : ''}<div class="process">${steps.join('<span class="p-arrow" aria-hidden="true">→</span>')}${c.cyclic ? '<span class="p-arrow" title="returns to stage 1">↻ back to stage 1</span>' : ''}</div></div>`;
}

function mapChart(c) {
  const one = (mp) => {
    let s = '<rect class="frame" x="0" y="0" width="100" height="100" rx="1"/>';
    const order = { road: 0, path: 1, water: 2, green: 3, sports: 4, parking: 5, building: 6 };
    const feats = [...mp.features].sort((a, b) => (order[a.kind] ?? 9) - (order[b.kind] ?? 9));
    feats.forEach((f) => { s += `<rect class="${esc(f.kind)}" x="${f.x}" y="${f.y}" width="${f.w}" height="${f.h}" rx="${f.kind === 'building' ? 0.6 : 0.3}"><title>${esc(f.label)}</title></rect>`; });
    feats.forEach((f) => {
      if (!f.label) return;
      const vertical = (f.kind === 'road' || f.kind === 'path') && f.h > f.w * 2;
      const fs = 3.2;
      const width = vertical ? f.h : f.w;
      const lines = wrapLabel(f.label, Math.max(4, Math.floor(width / (fs * 0.55))));
      const cx = f.x + f.w / 2, cy = f.y + f.h / 2;
      const tspans = lines.map((ln, i) => `<tspan x="${vertical ? 0 : cx}" dy="${i === 0 ? -(lines.length - 1) * fs * 0.55 : fs * 1.1}">${esc(ln)}</tspan>`).join('');
      s += vertical
        ? `<text transform="translate(${cx} ${cy}) rotate(-90)" text-anchor="middle" dominant-baseline="middle" font-size="${fs}">${tspans}</text>`
        : `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle" font-size="${fs}">${tspans}</text>`;
    });
    s += '<g transform="translate(93 8)"><path d="M0,-5 L2,1 L0,0 L-2,1 Z" fill="var(--ink)"/><text y="5.5" text-anchor="middle" font-size="3.4" font-weight="700">N</text></g>';
    return `<div class="stack" style="gap:6px"><div class="chart-title">${esc(mp.title || '')}</div><svg class="map-svg" viewBox="0 0 100 100" role="img" aria-label="${esc(mp.title || 'Map')}">${s}</svg></div>`;
  };
  return `<div class="chart">${c.title ? `<div class="chart-title">${esc(c.title)}</div>` : ''}<div class="maps">${c.maps.map(one).join('')}</div></div>`;
}

function renderChart(c) {
  if (!c) return '';
  switch (c.type) {
    case 'line': return lineChart(c);
    case 'bar': return barChart(c);
    case 'pie': return pieChart(c);
    case 'table': return tableChart(c);
    case 'process': return processChart(c);
    case 'map': return mapChart(c);
    case 'mixed': return `<div class="stack-lg">${(c.title ? `<div class="chart-title">${esc(c.title)}</div>` : '')}${c.parts.map(renderChart).join('')}</div>`;
    default: return '';
  }
}

/* ---------- progress: band-over-time small multiple ---------- */
function bandTrend(points, { target = 7, minTarget = 6.5, label = '' } = {}) {
  const W = 320, H = 150, m = { l: 30, r: 34, t: 12, b: 22 };
  const lo = Math.min(4, ...points.map((p) => Math.floor(p.band)));
  const hi = 9;
  const y = (v) => m.t + (H - m.t - m.b) * (1 - (v - lo) / (hi - lo));
  const n = points.length;
  const x = (i) => m.l + (W - m.l - m.r) * (n <= 1 ? 0.5 : i / (n - 1));
  let s = '';
  for (let v = lo; v <= hi; v += 1) {
    s += `<line x1="${m.l}" x2="${W - m.r}" y1="${y(v)}" y2="${y(v)}" stroke="var(--grid)" stroke-width="1"/><text x="${m.l - 6}" y="${y(v)}" text-anchor="end" dominant-baseline="middle" font-size="10">${v}</text>`;
  }
  s += `<line x1="${m.l}" x2="${W - m.r}" y1="${y(target)}" y2="${y(target)}" stroke="var(--ink)" stroke-width="1.5"/><text x="${W - m.r + 4}" y="${y(target)}" dominant-baseline="middle" font-size="10" font-weight="700" style="fill:var(--ink)">${target.toFixed(1)}</text>`;
  s += `<line x1="${m.l}" x2="${W - m.r}" y1="${y(minTarget)}" y2="${y(minTarget)}" stroke="var(--ink-3)" stroke-width="1"/><text x="${W - m.r + 4}" y="${y(minTarget)}" dominant-baseline="middle" font-size="10">${minTarget.toFixed(1)}</text>`;
  if (n) {
    const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.band).toFixed(1)}`).join(' ');
    s += `<path d="${d} L${x(n - 1).toFixed(1)},${y(lo)} L${x(0).toFixed(1)},${y(lo)} Z" fill="var(--accent)" opacity=".08"/>`;
    s += `<path d="${d}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round"/>`;
    points.forEach((p, i) => { s += `<circle cx="${x(i)}" cy="${y(p.band)}" r="${i === n - 1 ? 5 : 3.5}" fill="var(--accent)" stroke="var(--sheet)" stroke-width="2"><title>${esc(fmtDate(p.date))} · ${esc(p.label || '')}: ${fmtBand(p.band)}</title></circle>`; });
    s += `<text x="${x(0)}" y="${H - 6}" text-anchor="${n > 1 ? 'start' : 'middle'}" font-size="10">${esc(fmtDate(points[0].date, { day: 'numeric', month: 'short' }))}</text>`;
    if (n > 1) s += `<text x="${x(n - 1)}" y="${H - 6}" text-anchor="end" font-size="10">${esc(fmtDate(points[n - 1].date, { day: 'numeric', month: 'short' }))}</text>`;
  }
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)} band over time">${s}</svg>`;
}
