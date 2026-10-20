'use client';

import type { Result } from '../lib/model';

type T = (text: string, ...args: (string | number)[]) => string;
type Fmt = (value: number | undefined, digits?: number) => string;
export type BatchRun = { file: string; result: Result };

const hasFault = (result: Result) => result.buses.some(bus => bus.faultAmps.length);
const pct = (before: number | undefined, after: number | undefined) => before && after !== undefined ? (after - before) / before * 100 : undefined;

function csv(rows: (string | number)[][]) {
  return '﻿' + rows.map(row => row.map(value => typeof value === 'number' ? String(value) : '"' + (/^[=+@-]/.test(value) ? "'" : '') + value.replaceAll('"', '""') + '"').join(',')).join('\r\n');
}

// 依序執行的比較頁：每支腳本的摘要、故障分析結果，以及兩支潮流結果的各匯流排電壓變動率。
export function BatchCompare({ runs, compare, setCompare, t, fmt, onDownload }: { runs: BatchRun[]; compare: [number, number]; setCompare: (next: [number, number]) => void; t: T; fmt: Fmt; onDownload: (name: string, content: string) => void }) {
  const voltageRuns = runs.map((run, i) => i).filter(i => !hasFault(runs[i].result));
  const [a, b] = compare;
  const before = runs[a]?.result, after = runs[b]?.result;
  const rows = before && after ? before.buses.map(bus => {
    const other = after.buses.find(item => item.name === bus.name);
    const nodes = [1, 2, 3].map(node => {
      const v1 = bus.pu[bus.nodes.indexOf(node)], v2 = other?.pu[other.nodes.indexOf(node)];
      return { node, v1, v2, change: pct(v1, v2) };
    });
    const worst = Math.max(...nodes.map(item => Math.abs(item.change ?? 0)));
    return { bus, nodes, worst };
  }) : [];
  const peak = rows.reduce<(typeof rows)[number] | undefined>((max, row) => !max || row.worst > max.worst ? row : max, undefined);
  const exportCompare = () => onDownload('batch_voltage_change.csv', csv([
    ['Bus', 'BasekV_LN', 'Node', 'pu_' + runs[a].file, 'pu_' + runs[b].file, 'Change_%'],
    ...rows.flatMap(row => row.nodes.filter(item => item.v1 !== undefined).map(item => [row.bus.name, row.bus.baseKV, item.node, item.v1!, item.v2 ?? '', item.change ?? ''])),
  ]));
  return <div className="batch-compare">
    <table className="batch-runs"><thead><tr><th>#</th><th>{t('主腳本')}</th><th>{t('電路')}</th><th>{t('模式')}</th><th>{t('收斂')}</th></tr></thead>
      <tbody>{runs.map((run, i) => <tr key={run.file}><td>{i + 1}</td><td>{run.file}</td><td>{run.result.circuit}</td><td>{run.result.mode}</td><td>{run.result.converged ? t('已收斂') : t('尚未收斂')}</td></tr>)}</tbody></table>

    {runs.filter(run => hasFault(run.result)).map(run => <section key={run.file}>
      <h3>{t('故障電流（{0}）', run.file)}</h3>
      <table><thead><tr><th>{t('匯流排 Bus')}</th><th>{t('BasekV（L-N）')}</th>{[1, 2, 3].map(node => <th key={node}>{t('節點 {0}', node)} (A)</th>)}</tr></thead>
        <tbody>{run.result.buses.map(bus => <tr key={bus.name}><td>{bus.name}</td><td>{fmt(bus.baseKV)}</td>{[1, 2, 3].map(node => <td key={node}>{fmt(bus.faultAmps[bus.nodes.indexOf(node)], 1)}</td>)}</tr>)}</tbody></table>
    </section>)}

    <section>
      <h3>{t('電壓變動率')}</h3>
      {voltageRuns.length < 2 ? <div className="inline-empty">{t('需要兩支以上的潮流腳本才能比較電壓。')}</div> : <>
        <div className="table-tools batch-tools">
          <label>{t('比較前')}<select value={a} onChange={event => setCompare([Number(event.target.value), b])}>{voltageRuns.map(i => <option key={i} value={i}>{runs[i].file}</option>)}</select></label>
          <label>{t('比較後')}<select value={b} onChange={event => setCompare([a, Number(event.target.value)])}>{voltageRuns.map(i => <option key={i} value={i}>{runs[i].file}</option>)}</select></label>
          <button onClick={exportCompare}>{t('匯出比較 CSV')}</button>
        </div>
        {peak && <p className="batch-peak">{t('最大電壓變動率 {0}%，在 {1}', fmt(peak.worst), peak.bus.name)}<small>{t('變動率 = (後 − 前) ÷ 前 × 100%')}</small></p>}
        <table><thead><tr><th>{t('匯流排 Bus')}</th><th>{t('BasekV（L-N）')}</th>{[1, 2, 3].map(node => <th key={node}>{t('節點 {0}', node)}</th>)}<th>{t('最大變動率 %')}</th></tr></thead>
          <tbody>{rows.map(row => <tr key={row.bus.name} className={row === peak ? 'batch-peak-row' : ''}><td>{row.bus.name}</td><td>{fmt(row.bus.baseKV)}</td>
            {row.nodes.map(item => <td key={item.node}>{item.v1 === undefined ? '—' : <>{fmt(item.v1, 5)} → {fmt(item.v2, 5)}<br /><b>{item.change === undefined ? '—' : (item.change >= 0 ? '+' : '') + fmt(item.change) + '%'}</b></>}</td>)}
            <td><b>{fmt(row.worst)}</b></td></tr>)}</tbody></table>
      </>}
    </section>
  </div>;
}
