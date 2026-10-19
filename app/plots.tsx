'use client';

import { useState } from 'react';
import type { Result } from '../lib/model';

type T = (text: string) => string;
const busOf = (name: string) => name.split('.')[0].toLowerCase();
const phaseColor = ['#2b6fce', '#14a38b', '#d78d37'];

function scale(values: number[], from: number, to: number) {
  const min = Math.min(...values), max = Math.max(...values), span = max - min || 1;
  return { min, max, at: (value: number) => from + (value - min) / span * (to - from) };
}

// 電路圖：OpenDSS Plot Circuit 的網頁版，線寬表示電流，顏色表示電壓（故障分析時表示故障電流）。
export function CircuitPlot({ result, t }: { result: Result; t: T }) {
  const coords = new Map(result.coords.map(item => [item.bus.toLowerCase(), item]));
  if (coords.size < 2) return <div className="inline-empty">{t('模型沒有匯流排座標。請在主檔加入 Buscoords 檔案（例如 Buscoords BusCoords.dat）後重新求解。')}</div>;
  const fault = result.buses.some(bus => bus.faultAmps.length);
  const busValue = new Map(result.buses.map(bus => {
    const values = (fault ? bus.faultAmps : bus.pu).filter((_, i) => bus.nodes[i] >= 1 && bus.nodes[i] <= 3);
    return [bus.name.toLowerCase(), values.length ? (fault ? Math.max(...values) : Math.min(...values)) : undefined];
  }));
  const x = scale([...coords.values()].map(item => item.x), 30, 770), y = scale([...coords.values()].map(item => item.y), 390, 30);
  const segments = result.elements.flatMap(element => {
    const [kind] = element.name.replaceAll('"', '').split('.');
    if (element.buses.length < 2 || /^(vsource|regcontrol|capcontrol|energymeter|monitor)$/i.test(kind)) return [];
    const from = coords.get(busOf(element.buses[0])), to = coords.get(busOf(element.buses[1]));
    return from && to && from !== to ? [{ element, kind: kind.toLowerCase(), from, to, value: busValue.get(busOf(element.buses[1])) }] : [];
  });
  const maxAmps = Math.max(1, ...segments.map(item => Math.max(0, ...item.element.amps)));
  const maxFault = Math.max(1, ...[...busValue.values()].filter((value): value is number => value !== undefined));
  const color = (value: number | undefined) => value === undefined ? '#aab6c3' : fault ? `hsl(${Math.round(210 - value / maxFault * 200)} 70% 45%)` : value < .95 ? '#d44a3a' : value > 1.05 ? '#d78d37' : '#14a38b';
  return <div className="plot-panel">
    <div className="plot-description"><strong>{t('電路圖（Plot Circuit）')}</strong>{fault ? <span>{t('顏色：故障電流，藍色低、紅色高')}</span> : <span><i style={{ background: '#14a38b' }} />0.95–1.05 <i style={{ background: '#d44a3a' }} />&lt; 0.95 <i style={{ background: '#d78d37' }} />&gt; 1.05 p.u.</span>}<small>{t('線寬：第一端電流 · 虛線：變壓器')}</small></div>
    <svg viewBox="0 0 800 420" role="img" aria-label={t('電路圖（Plot Circuit）')}>
      {segments.map(({ element, kind, from, to, value }) => <line key={element.name} x1={x.at(from.x)} y1={y.at(from.y)} x2={x.at(to.x)} y2={y.at(to.y)} stroke={color(value)} strokeWidth={1 + 5 * Math.max(0, ...element.amps) / maxAmps} strokeDasharray={kind === 'transformer' ? '5 3' : undefined} strokeLinecap="round"><title>{element.name.replaceAll('"', '')} · {Math.max(0, ...element.amps).toFixed(1)} A</title></line>)}
      {[...coords.values()].map(item => <circle key={item.bus} cx={x.at(item.x)} cy={y.at(item.y)} r={result.buses[0]?.name.toLowerCase() === item.bus.toLowerCase() ? 5 : 1.8} fill="#41566b"><title>{item.bus}{busValue.get(item.bus.toLowerCase()) !== undefined ? ' · ' + busValue.get(item.bus.toLowerCase())!.toFixed(fault ? 1 : 4) + (fault ? ' A' : ' p.u.') : ''}</title></circle>)}
    </svg>
  </div>;
}

// 電壓剖面：OpenDSS Plot Profile，需要 EnergyMeter 才有距離。
export function ProfilePlot({ result, t }: { result: Result; t: T }) {
  if (!result.profile.length) return <div className="inline-empty">{t('沒有電壓剖面資料。請在饋線起點加入 EnergyMeter（例如 New EnergyMeter.Feeder Element=Line.L1 Terminal=1），並用穩態潮流或依腳本模式求解。')}</div>;
  const distances = result.profile.flatMap(item => [item.d1, item.d2]), volts = result.profile.flatMap(item => [item.v1, item.v2]);
  const x = scale([0, ...distances], 55, 780), y = scale([Math.min(.94, ...volts), Math.max(1.06, ...volts)], 210, 15);
  const ticks = [y.min, (y.min + y.max) / 2, y.max];
  return <div className="plot-panel">
    <div className="plot-description"><strong>{t('電壓剖面（Plot Profile）')}</strong><span>{[1, 2, 3].map(phase => <span key={phase}><i style={{ background: phaseColor[phase - 1] }} />{t('相')} {phase} </span>)}</span><small>{t('橫軸：與電度表距離（km）· 縱軸：p.u.')}</small></div>
    <svg viewBox="0 0 800 240" role="img" aria-label={t('電壓剖面（Plot Profile）')}>
      {ticks.map(value => <g key={value}><line x1="55" x2="780" y1={y.at(value)} y2={y.at(value)} stroke="#e7edf4" /><text x="4" y={y.at(value) + 3}>{value.toFixed(3)}</text></g>)}
      {[.95, 1.05].map(value => <line key={value} x1="55" x2="780" y1={y.at(value)} y2={y.at(value)} stroke="#dfb075" strokeDasharray="4 4" />)}
      {result.profile.map((item, i) => <line key={i} x1={x.at(item.d1)} y1={y.at(item.v1)} x2={x.at(item.d2)} y2={y.at(item.v2)} stroke={phaseColor[(item.phase - 1) % 3] ?? '#41566b'} strokeWidth="1.6"><title>{item.name} · {item.v2.toFixed(4)} p.u.</title></line>)}
      <text x="55" y="234">0</text><text x="780" y="234" textAnchor="end">{x.max.toFixed(2)} km</text>
    </svg>
  </div>;
}

// 曲線圖：把任一份 CSV 報表（Export Monitors、LoadShape 等）畫成折線，對應 Plot Monitor。
export function CurvePlot({ result, t }: { result: Result; t: T }) {
  const tables = result.reports.filter(report => /\.csv$/i.test(report.name)).map(report => {
    const lines = report.content.trim().split(/\r?\n/).map(line => line.split(',').map(cell => cell.trim()));
    const rows = lines.slice(1).map(row => row.map(Number)).filter(row => row.length === lines[0].length && row.every(Number.isFinite));
    return { name: report.name, header: lines[0], rows };
  }).filter(table => table.rows.length > 1 && table.header.length > 1);
  const [name, setName] = useState('');
  const [xColumn, setXColumn] = useState(0);
  const [picked, setPicked] = useState<number[]>([]);
  const table = tables.find(item => item.name === name) ?? tables.find(item => /_mon_/i.test(item.name)) ?? tables[0];
  if (!table) return <div className="inline-empty">{t('沒有可繪製的 CSV。請先加入 Monitor、執行 Daily 等模式求解，再用「匯出 → Export Monitors」或其他 Export 產生 CSV。')}</div>;
  const xi = Math.min(xColumn, table.header.length - 1);
  const yCols = (picked.length ? picked : table.header.map((_, i) => i).filter(i => i !== xi && !/^(hour|t\(sec\))$/i.test(table.header[i])).slice(0, 3)).filter(i => i < table.header.length);
  const xs = table.rows.map(row => xi === 0 && /^hour$/i.test(table.header[0]) && /^t\(sec\)$/i.test(table.header[1] ?? '') ? row[0] + row[1] / 3600 : row[xi]);
  const ys = table.rows.flatMap(row => yCols.map(i => row[i]));
  const x = scale(xs, 60, 780), y = scale(ys.length ? ys : [0, 1], 210, 15);
  return <div className="plot-panel">
    <div className="plot-controls">
      <select aria-label={t('選擇 CSV 報表')} value={table.name} onChange={event => { setName(event.target.value); setXColumn(0); setPicked([]); }}>{tables.map(item => <option key={item.name}>{item.name}</option>)}</select>
      <label>{t('橫軸')} <select value={xi} onChange={event => setXColumn(Number(event.target.value))}>{table.header.map((head, i) => <option key={i} value={i}>{head}</option>)}</select></label>
      <span className="column-chips">{table.header.map((head, i) => i === xi ? null : <label key={i}><input type="checkbox" checked={yCols.includes(i)} onChange={event => setPicked(event.target.checked ? [...yCols, i] : yCols.filter(item => item !== i))} />{head}</label>)}</span>
    </div>
    <svg viewBox="0 0 800 240" role="img" aria-label={t('曲線圖（Plot Monitor）')}>
      {[y.min, (y.min + y.max) / 2, y.max].map(value => <g key={value}><line x1="60" x2="780" y1={y.at(value)} y2={y.at(value)} stroke="#e7edf4" /><text x="4" y={y.at(value) + 3}>{Number(value.toPrecision(5))}</text></g>)}
      {yCols.map((col, k) => <polyline key={col} fill="none" stroke={['#2b6fce', '#14a38b', '#d78d37', '#8a5cc7', '#d44a3a', '#41566b'][k % 6]} strokeWidth="1.8" points={table.rows.map((row, i) => x.at(xs[i]) + ',' + y.at(row[col])).join(' ')}><title>{table.header[col]}</title></polyline>)}
      <text x="60" y="234">{Number(x.min.toPrecision(5))}</text><text x="780" y="234" textAnchor="end">{Number(x.max.toPrecision(5))}</text>
    </svg>
    <div className="plot-legend">{yCols.map((col, k) => <span key={col}><i style={{ background: ['#2b6fce', '#14a38b', '#d78d37', '#8a5cc7', '#d44a3a', '#41566b'][k % 6] }} />{table.header[col]}</span>)}</div>
  </div>;
}
