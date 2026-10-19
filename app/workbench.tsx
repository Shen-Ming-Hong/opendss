'use client';

import { useEffect, useRef, useState } from 'react';
import { Activity, ArrowDownToLine, Braces, Check, CircleHelp, Cloud, Code2, Download, FilePlus2, FileText, FolderOpen, Gauge, Globe, Info, Loader2, Maximize2, Network, PanelRightClose, Play, Save, Search, Settings2, Terminal, X, Zap } from 'lucide-react';
import { example, type ModelFile, type Result } from '../lib/model';

type Tab = 'summary' | 'voltage' | 'current' | 'fault' | 'plot' | 'reports';
type Log = { time: string; message: string; kind: string };
const tabs: [Tab,string][] = [['summary','電路摘要'],['voltage','匯流排電壓'],['current','元件電流'],['fault','故障電流'],['plot','電壓圖表'],['reports','文字報表']];
const initialFiles = [{name:'Demo_Feeder.dss',content:example}];
const fmt = (value: number | undefined, digits=3) => Number.isFinite(value) ? value!.toLocaleString('en-US',{minimumFractionDigits:digits,maximumFractionDigits:digits}) : '—';
function download(name:string,content:string,mime='text/plain;charset=utf-8') {
  const url=URL.createObjectURL(new Blob([content],{type:mime}));
  const anchor=document.createElement('a'); anchor.href=url; anchor.download=name; anchor.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function paint(line:string) {
  if(line.trim().startsWith('!')) return <span className="syntax-comment">{line||' '}</span>;
  return line.split(/("[^"]*"|\b(?:New|Clear|Set|Solve|CalcVoltageBases|Edit|Redirect|Compile)\b|\b\d+(?:\.\d+)?\b)/gi).map((part,i)=><span key={i} className={/^"/.test(part)?'syntax-string':/^(new|clear|set|solve|calcvoltagebases|edit|redirect|compile)$/i.test(part)?'syntax-command':/^\d/.test(part)?'syntax-number':undefined}>{part}</span>);
}

export default function Workbench() {
  const [files,setFiles]=useState<ModelFile[]>(initialFiles);
  const [entry,setEntry]=useState('Demo_Feeder.dss');
  const [active,setActive]=useState('Demo_Feeder.dss');
  const [commands,setCommands]=useState('! 額外指令可輸入於此，再按「執行指令」。\n! 例如：Edit Load.Load1 kW=1000\n');
  const [input,setInput]=useState('');
  const [mode,setMode]=useState('snapshot');
  const [result,setResult]=useState<Result|null>(null);
  const [stale,setStale]=useState(false);
  const [busy,setBusy]=useState(false);
  const [connection,setConnection]=useState('正在檢查雲端引擎');
  const [connected,setConnected]=useState(false);
  const [logs,setLogs]=useState<Log[]>([]);
  const [tab,setTab]=useState<Tab>('summary');
  const [showConsole,setShowConsole]=useState(true);
  const [showResults,setShowResults]=useState(true);
  const [elementType,setElementType]=useState('All');
  const [element,setElement]=useState('');
  const [query,setQuery]=useState('');
  const [fontSize,setFontSize]=useState(13);
  const [caret,setCaret]=useState({line:1,column:1});
  const [restored,setRestored]=useState(false);
  const uploader=useRef<HTMLInputElement>(null), folder=useRef<HTMLInputElement>(null);
  const editor=useRef<HTMLTextAreaElement>(null), painted=useRef<HTMLPreElement>(null), gutter=useRef<HTMLDivElement>(null);
  const help=useRef<HTMLDialogElement>(null), logEnd=useRef<HTMLDivElement>(null);
  const source=files.find(file=>file.name===active)?.content??'';
  const revision=useRef('');
  revision.current=JSON.stringify({files,entry,commands,mode});
  function log(message:string,kind='info') {setLogs(prev=>[...prev.slice(-99),{time:new Date().toLocaleTimeString('zh-TW',{hour12:false}),message,kind}]);}
  useEffect(()=>{
    try {
      const saved=JSON.parse(localStorage.getItem('opendss-workspace-v1')??'null');
      if(saved?.files?.length && saved.files.every((file:ModelFile)=>typeof file.name==='string'&&typeof file.content==='string') && saved.files.some((file:ModelFile)=>file.name===saved.entry)) {
        setFiles(saved.files);setEntry(saved.entry);setActive(saved.entry);setCommands(saved.commands??'');
      }
    } catch {}
    setRestored(true);
    const controller=new AbortController();
    fetch('/api/engine',{signal:controller.signal}).then(async response=>{const data=await response.json() as {error?:string};setConnected(response.ok);setConnection(response.ok?'雲端引擎已連線':data.error??'引擎暫時無法連線');}).catch(()=>{if(!controller.signal.aborted)setConnection('引擎暫時無法連線');});
    return ()=>controller.abort();
  },[]);
  useEffect(()=>{
    if(!restored)return;
    try{localStorage.setItem('opendss-workspace-v1',JSON.stringify({files,entry,commands}));}catch{log('瀏覽器儲存空間不足，請下載模型保留修改。','error');}
  },[files,entry,commands,restored]);
  useEffect(()=>{const panel=logEnd.current?.parentElement;if(panel)panel.scrollTop=panel.scrollHeight;},[logs]);
  useEffect(()=>{
    function key(event:KeyboardEvent){
      if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='s'){event.preventDefault();download(active,source);}
      if(event.key==='Escape')document.querySelectorAll('.menu[open]').forEach(node=>node.removeAttribute('open'));
    }
    function close(event:MouseEvent){if(!(event.target as HTMLElement).closest('.menu-bar'))document.querySelectorAll('.menu[open]').forEach(node=>node.removeAttribute('open'));}
    window.addEventListener('keydown',key);window.addEventListener('click',close);
    return ()=>{window.removeEventListener('keydown',key);window.removeEventListener('click',close);};
  },[active,source]);
  async function run(action:'compile'|'solve'='solve',extra=commands){
    if(busy)return;
    const submitted=JSON.stringify({files,entry,commands:action==='compile'?commands:extra,mode});
    setBusy(true);log(action==='compile'?'正在編譯 '+entry+'…':'正在執行'+(mode==='faultstudy'?'故障分析':'穩態潮流')+'…');
    try{
      const response=await fetch('/api/engine',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({files,entry,commands:action==='compile'?'':extra,analysis:mode,action}),signal:AbortSignal.timeout(60000)});
      const data=await response.json() as Result & {error?:string};
      if(!response.ok||data.error)throw Error(data.error??'計算失敗，請檢查模型。');
      setResult(data);setStale(submitted!==revision.current);setConnected(true);setConnection('雲端引擎已連線');setElement('');setShowResults(true);
      if(mode==='faultstudy'&&action==='solve')setTab('fault');
      log((action==='compile'?'編譯完成':'計算完成')+'｜'+data.circuit+'｜'+(data.converged?'已收斂':'尚未收斂')+'｜'+data.elapsedMS+' ms',data.converged?'success':'error');
      if(data.message)log(data.message);
    }catch(error){setStale(true);log(error instanceof Error?error.message:'執行失敗，請重試。','error');}
    finally{setBusy(false);}
  }
  async function openFiles(list:FileList|null){
    if(!list?.length)return;
    try{
      if(list.length===1&&list[0].name.endsWith('.opendss.json')){
        const project=JSON.parse(await list[0].text());
        if(!Array.isArray(project.files)||!project.files.length||!project.files.every((file:ModelFile)=>typeof file.name==='string'&&typeof file.content==='string')||!project.files.some((file:ModelFile)=>file.name===project.entry))throw Error('專案檔格式錯誤。');
        if(!window.confirm('開啟專案會取代此裝置的草稿。請先下載需要保留的模型。確定開啟？'))return;
        setFiles(project.files);setEntry(project.entry);setActive(project.entry);setCommands(project.commands??'');setResult(null);log('已開啟專案。');return;
      }
      const selected=Array.from(list).filter(file=>/\.(dss|csv|txt|dat)$/i.test(file.name));
      if(selected.length>100||selected.reduce((sum,file)=>sum+file.size,0)>2*1024*1024)throw Error('上限為 100 個檔案、合計 2 MB。');
      const imported=await Promise.all(selected.map(async file=>{
        const bytes=await file.arrayBuffer();let content;
        try{content=new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{content=new TextDecoder('big5').decode(bytes);}
        return {name:file.webkitRelativePath?file.webkitRelativePath.split('/').slice(1).join('/'):file.name,content};
      }));
      const main=imported.find(file=>/master[^/]*\.dss$/i.test(file.name))??imported.find(file=>/\.dss$/i.test(file.name));
      if(!main)throw Error('至少需要一個 .dss 模型檔案。');
      if(!window.confirm('開啟新模型會取代此裝置的草稿。請先下載需要保留的檔案。確定開啟？'))return;
      setFiles(imported);setEntry(main.name);setActive(main.name);setCommands('');setResult(null);setStale(false);log('已開啟 '+imported.length+' 個檔案，主檔：'+main.name);
    }catch(error){log(error instanceof Error?error.message:'讀取檔案失敗。','error');}
    finally{if(uploader.current)uploader.current.value='';if(folder.current)folder.current.value='';}
  }
  function show(next:Tab){setTab(next);setShowResults(true);}
  function exportCSV(){
    if(!result||stale)return;
    const rows:(string|number)[][]=[['Bus','BasekV_LN','Node','Volts','pu','Fault_A']];
    for(const bus of result.buses)bus.nodes.forEach((node,i)=>rows.push([bus.name,bus.baseKV,node,bus.volts[i]??'',bus.pu[i]??'',bus.faultAmps[i]??'']));
    const csv=rows.map(row=>row.map(value=>typeof value==='number'?String(value):'"'+(/^[=+@-]/.test(value)?"'":'')+value.replaceAll('"','""')+'"').join(',')).join('\r\n');
    download(result.circuit+'_voltages.csv','\uFEFF'+csv,'text/csv;charset=utf-8');log('已匯出匯流排電壓 CSV。');
  }
  function newModel(){if(!window.confirm('建立新模型會取代此裝置的草稿，確定繼續？'))return;const name='Untitled.dss';setFiles([{name,content:'Clear\nNew Circuit.Untitled BasekV=11.4 pu=1.0 Phases=3\n\nSet VoltageBases=[11.4]\nCalcVoltageBases\nSolve\n'}]);setEntry(name);setActive(name);setCommands('');setResult(null);log('已建立新模型。');}
  function restoreExample(){if(!window.confirm('載入範例會取代此裝置的草稿，確定繼續？'))return;setFiles(initialFiles);setEntry(initialFiles[0].name);setActive(initialFiles[0].name);setCommands('');setResult(null);log('已載入三相配電範例。');}
  function selectLine(){const area=editor.current;if(!area)return;const before=source.slice(0,area.selectionStart);const selected=source.slice(area.selectionStart,area.selectionEnd)||source.split('\n')[before.split('\n').length-1];setCommands(prev=>prev+'\n'+selected+'\n');setShowConsole(true);log('已將選取內容加入主要指令視窗，請確認後執行。');}
  const menus:[string,string,[string,()=>void,boolean?][]][]=[
    ['檔案','File',[['新增模型',newModel],['開啟檔案…',()=>uploader.current?.click()],['開啟模型資料夾…',()=>folder.current?.click()],['下載目前檔案',()=>download(active,source)],['下載完整專案',()=>download('Project.opendss.json',JSON.stringify({files,entry,commands},null,2),'application/json')]]],
    ['編輯','Edit',[['選取全部',()=>{editor.current?.focus();editor.current?.select();}],['放大字體',()=>setFontSize(size=>Math.min(20,size+1))],['縮小字體',()=>setFontSize(size=>Math.max(11,size-1))]]],
    ['執行','Do',[['編譯主檔（Compile）',()=>run('compile'),busy],['求解（Solve）',()=>run(),busy],['選取內容加入指令視窗',selectLine]]],
    ['設定','Set',[['穩態潮流（Snapshot）',()=>{setMode('snapshot');setStale(!!result);}],['故障分析（FaultStudy）',()=>{setMode('faultstudy');setStale(!!result);}]]],
    ['建立','Make',[['新增空白模型',newModel],['載入配電範例',restoreExample]]],
    ['匯出','Export',[['匯流排電壓 CSV',exportCSV,!result||stale],['完整計算結果 JSON',()=>result&&download(result.circuit+'_results.json',JSON.stringify(result,null,2),'application/json'),!result||stale]]],
    ['顯示','Show',tabs.filter(([key])=>key!=='plot').map(([key,name])=>[name,()=>show(key)])],
    ['視覺化','Visualize',[['目前元件的電流與功率',()=>show('current')]]],
    ['繪圖','Plot',[['匯流排電壓圖',()=>show('plot')]]],
    ['重設','Reset',[['清除計算結果',()=>{setResult(null);log('已清除計算結果。');}],['清除執行紀錄',()=>setLogs([])]]],
    ['視窗','Window',[[showConsole?'隱藏主要指令視窗':'顯示主要指令視窗',()=>setShowConsole(value=>!value)],[showResults?'隱藏結果視窗':'顯示結果視窗',()=>setShowResults(value=>!value)]]],
    ['說明','Help',[['使用說明與指令對照',()=>help.current?.showModal()],['OpenDSS 官方文件 ↗',()=>window.open('https://opendss.epri.com/','_blank','noopener,noreferrer')]]]
  ];
  const elements=result?.elements.filter(item=>elementType==='All'||item.name.toLowerCase().startsWith(elementType.toLowerCase()+'.'))??[];
  const buses=result?.buses.filter(bus=>bus.name.toLowerCase().includes(query.toLowerCase()))??[];
  const volts=result?.buses.flatMap(bus=>bus.pu.filter((_,i)=>bus.nodes[i]>=1&&bus.nodes[i]<=3&&bus.baseKV>0))??[];
  const minPU=volts.length?Math.min(...volts):undefined,maxPU=volts.length?Math.max(...volts):undefined;
  const plotMin=Math.min(.94,minPU??.94),plotMax=Math.max(1.06,maxPU??1.06),plotY=(value:number)=>108-(value-plotMin)/(plotMax-plotMin)*95;
  return <main className="workbench">
    <input ref={uploader} type="file" multiple accept=".dss,.csv,.txt,.dat,.json" hidden onChange={event=>openFiles(event.target.files)}/>
    <input ref={folder} type="file" multiple hidden {...{webkitdirectory:''}} onChange={event=>openFiles(event.target.files)}/>
    <header className="title-bar"><div className="app-brand"><span className="app-mark"><Zap size={18} fill="currentColor"/></span><h1>OpenDSS</h1><span className="brand-divider"/><span className="edition">繁體中文雲端工作台</span><span className="version-badge">WEB PREVIEW</span></div><div className="title-meta"><span><Globe size={14}/>免登入使用</span><button aria-label="使用說明" onClick={()=>help.current?.showModal()}><CircleHelp size={17}/></button></div></header>
    <nav className="menu-bar" aria-label="主要功能表">{menus.map(([name,en,items])=><details className="menu" key={name}><summary title={en} onClick={event=>{const current=event.currentTarget.parentElement;document.querySelectorAll('.menu[open]').forEach(node=>{if(node!==current)node.removeAttribute('open');});}}>{name}</summary><div className="menu-popup">{items.map(([label,action,disabled])=><button key={label} disabled={disabled} onClick={event=>{event.currentTarget.closest('details')?.removeAttribute('open');action();}}>{label}</button>)}</div></details>)}<span className="menu-end">熟悉的指令，熟悉的工作流程</span></nav>
    <div className="toolbar" role="toolbar" aria-label="常用工具"><div className="tool-group"><button title="新增模型" aria-label="新增模型" onClick={newModel}><FilePlus2/></button><button title="開啟檔案" aria-label="開啟檔案" onClick={()=>uploader.current?.click()}><FolderOpen/></button><button title="下載目前檔案（⌘/Ctrl+S）" aria-label="下載目前檔案" onClick={()=>download(active,source)}><Save/></button></div><div className="tool-group"><button className="tool-label" disabled={busy} title="Compile：載入並執行主檔" aria-label="編譯" onClick={()=>run('compile')}><Braces/><span>編譯</span></button><button className="solve-button" disabled={busy} onClick={()=>run()}>{busy?<Loader2 className="spin"/>:<Play fill="currentColor"/>}<span>{busy?'執行中':'求解'}</span></button></div><div className="tool-group"><button className="tool-label" aria-label="摘要" onClick={()=>show('summary')}><FileText/><span>摘要</span></button><button className="tool-label" aria-label="繪圖" onClick={()=>show('plot')}><Activity/><span>繪圖</span></button><button className="tool-label" aria-label="匯出" disabled={!result||stale} onClick={exportCSV}><ArrowDownToLine/><span>匯出</span></button></div><div className="toolbar-spacer"/><button className="tool-label console-toggle" title="切換主要指令視窗" aria-label="切換主要指令視窗" onClick={()=>setShowConsole(value=>!value)}><Terminal/><span>指令視窗</span></button><span className={'cloud-status '+(connected?'online':'')} title={connection}><Cloud size={15}/><span>{connected?'雲端已連線':connection}</span><i/></span></div>
    <div className="selector-row"><div className="selector"><Network size={15}/><label htmlFor="element-type">元件類型</label><select id="element-type" value={elementType} onChange={event=>{setElementType(event.target.value);setElement('');}}><option value="All">全部元件</option>{[['Vsource','電壓源'],['Transformer','變壓器'],['Line','線路'],['Load','負載'],['PVSystem','太陽光電'],['Generator','發電機']].map(([value,label])=><option key={value} value={value}>{label} · {value}</option>)}</select><select aria-label="選取電路元件" value={element} onChange={event=>setElement(event.target.value)}><option value="">{result?'選取元件…':'請先編譯模型'}</option>{elements.map(item=><option key={item.name}>{item.name}</option>)}</select><button disabled={!result} title="顯示元件資訊" aria-label="顯示元件資訊" onClick={()=>show('current')}><Info size={16}/></button></div><div className="selector analysis"><Settings2 size={15}/><label htmlFor="analysis">求解模式</label><select id="analysis" value={mode} onChange={event=>{setMode(event.target.value);setStale(!!result);}}><option value="snapshot">穩態潮流 · Snapshot</option><option value="faultstudy">故障分析 · FaultStudy</option></select><span className="frequency">{result?.frequency??60} Hz</span></div></div>
    <div className="script-row"><Code2 size={15}/><label htmlFor="entry">主腳本</label><select id="entry" value={entry} onChange={event=>{setEntry(event.target.value);setActive(event.target.value);setStale(!!result);}}>{files.filter(file=>/\.dss$/i.test(file.name)).map(file=><option key={file.name}>{file.name}</option>)}</select><button title="編譯主腳本" aria-label="編譯主腳本" disabled={busy} onClick={()=>run('compile')}><Braces size={15}/></button><span className="draft-label"><Check size={13}/>草稿暫存於此裝置</span><span className="file-count">{files.length} 個檔案</span></div>
    <div className={'result-strip '+(result&&!stale?'has-result':'')} role="status"><span className="result-label">結果</span>{busy?<><Loader2 size={13} className="spin"/><span>雲端引擎正在執行模型…</span></>:result?<><span className={'status-dot '+(stale?'warning':result.converged?'success':'error')}/><strong>{stale?'模型已變更，請重新求解':result.converged?'計算收斂':'計算尚未收斂'}</strong><span className="strip-detail">{result.circuit} · {result.buses.length} 個匯流排 · {result.elements.length} 個元件</span><span className="strip-time">{result.elapsedMS} ms</span></>:<><span className="status-dot"/><span>尚未編譯模型。開啟 .dss 主檔，或直接編譯目前範例。</span></>}</div>
    <div className={'editor-workspace '+(!showConsole?'console-hidden':'')}><section className="script-editor" aria-label="模型腳本編輯器"><div className="panel-heading"><span><Code2 size={14}/>模型腳本</span><div className="panel-actions"><button aria-label="縮小字體" onClick={()=>setFontSize(size=>Math.max(11,size-1))}>A−</button><button aria-label="放大字體" onClick={()=>setFontSize(size=>Math.min(20,size+1))}>A+</button><button title="放大編輯區" aria-label="放大編輯區" onClick={()=>{setShowConsole(false);setShowResults(false);}}><Maximize2 size={13}/></button></div></div><div className="file-tabs" role="tablist" aria-label="已開啟檔案">{files.map(file=><button role="tab" aria-selected={active===file.name} className={active===file.name?'selected':''} key={file.name} onClick={()=>setActive(file.name)}><FileText size={13}/>{file.name}{entry===file.name&&<span className="entry-dot" title="主腳本"/>}</button>)}</div><div className="code-editor" style={{fontSize}}><div className="line-numbers" ref={gutter} aria-hidden="true">{source.split('\n').map((_,i)=><div key={i}>{i+1}</div>)}</div><div className="code-surface"><pre ref={painted} aria-hidden="true">{source.split('\n').map((line,i)=><div key={i}>{paint(line)}{'\n'}</div>)}</pre><textarea ref={editor} aria-label="DSS 模型內容" value={source} spellCheck={false} wrap="off" onChange={event=>{const content=event.target.value;setFiles(prev=>prev.map(file=>file.name===active?{...file,content}:file));setStale(!!result);}} onScroll={event=>{if(painted.current){painted.current.scrollTop=event.currentTarget.scrollTop;painted.current.scrollLeft=event.currentTarget.scrollLeft;}if(gutter.current)gutter.current.scrollTop=event.currentTarget.scrollTop;}} onSelect={()=>{const before=source.slice(0,editor.current?.selectionStart??0).split('\n');setCaret({line:before.length,column:before.at(-1)!.length+1});}}/></div></div><div className="editor-footer"><span>DSS 腳本 · UTF-8</span><span>第 {caret.line} 行，第 {caret.column} 欄</span></div></section>
    {showConsole&&<section className="console-panel" aria-label="主要指令視窗"><div className="panel-heading"><span><Terminal size={14}/>主要指令視窗</span><button title="隱藏指令視窗" aria-label="隱藏指令視窗" onClick={()=>setShowConsole(false)}><PanelRightClose size={14}/></button></div><div className="scratch-caption">Main Script Window <span>額外指令</span></div><textarea className="scratch-editor" aria-label="額外 DSS 指令" value={commands} spellCheck={false} onChange={event=>{setCommands(event.target.value);setStale(!!result);}}/><div className="scratch-actions"><span><i/>套用於目前主腳本</span><button disabled={busy} onClick={()=>run()}><Play size={11} fill="currentColor"/>執行指令</button></div><div className="console-log-heading"><span>執行紀錄</span><button onClick={()=>setLogs([])}>清除</button></div><div className="console-log" role="log" aria-label="執行紀錄">{logs.length?logs.map((line,i)=><div className={'log-line '+line.kind} key={i}><time>{line.time}</time><span>{line.message}</span></div>):<div className="log-welcome"><Terminal size={22}/><span>已準備就緒</span><p>編譯模型後，執行紀錄會顯示於此。</p></div>}<div ref={logEnd}/></div><form className="command-input" onSubmit={event=>{event.preventDefault();if(!input.trim()||busy)return;const next=commands+'\n'+input+'\n';setCommands(next);setInput('');run('solve',next);}}><span>›</span><input aria-label="輸入單行 DSS 指令" placeholder="輸入指令，例如 Summary" value={input} onChange={event=>setInput(event.target.value)}/><button disabled={busy||!input.trim()} aria-label="送出指令"><ArrowDownToLine size={14} className="send-arrow"/></button></form></section>}</div>
    {showResults&&<section className="results-panel" aria-label="計算結果"><div className="results-top"><div className="result-tabs" role="tablist" aria-label="結果分類">{tabs.map(([key,name])=><button role="tab" aria-selected={tab===key} key={key} className={tab===key?'selected':''} onClick={()=>setTab(key)}>{name}</button>)}</div><button className="collapse-results" aria-label="隱藏結果視窗" onClick={()=>setShowResults(false)}><X size={14}/></button></div>{result?<div className={'result-content '+(stale?'stale':'')}>
      {tab==='summary'&&<div className="summary-grid"><div><span>作用中電路</span><strong className="circuit-name">{result.circuit}</strong><small>{result.mode} · {result.frequency} Hz</small></div><div><span>電源供電</span><strong>{fmt(result.power[0])}<em>kW</em></strong><small>{fmt(result.power[1])} kvar</small></div><div><span>總有功損失</span><strong>{fmt(result.losses[0])}<em>kW</em></strong><small>{result.power[0]?fmt(result.losses[0]/Math.abs(result.power[0])*100):'—'}% 佔電源供電</small></div><div><span>相電壓範圍（節點 1–3）</span><strong>{fmt(minPU,4)}<em>– {fmt(maxPU,4)} p.u.</em></strong><small>{result.buses.length} 匯流排 · {result.iterations} 次迭代</small></div></div>}
      {(tab==='voltage'||tab==='fault')&&<><div className="table-tools"><span>{tab==='fault'?'各匯流排三相短路電流':'相對中性點電壓 · BasekV 為相電壓'}</span><label><Search size={13}/><input aria-label="搜尋匯流排" placeholder="搜尋匯流排…" value={query} onChange={event=>setQuery(event.target.value)}/></label></div>{tab==='fault'&&!result.buses.some(bus=>bus.faultAmps.length)?<div className="inline-empty"><Info size={17}/>請將求解模式設為「故障分析」，再按「求解」。</div>:<table><thead><tr><th>匯流排 Bus</th><th>BasekV（L-N）</th>{[1,2,3].map(node=><th key={node}>節點 {node} {tab==='fault'?'(A)':'(p.u.)'}</th>)}</tr></thead><tbody>{buses.map(bus=><tr key={bus.name}><td>{bus.name}</td><td>{fmt(bus.baseKV)}</td>{[1,2,3].map(node=>{const value=(tab==='fault'?bus.faultAmps:bus.pu)[bus.nodes.indexOf(node)];return <td key={node} className={tab==='voltage'&&value!==undefined&&(value<.95||value>1.05)?'violation':''}>{fmt(value,tab==='fault'?1:5)}</td>;})}</tr>)}</tbody></table>}</>}
      {tab==='current'&&<><div className="table-tools"><span>第一端電流與流入元件的功率 · 負值表示流出</span><button onClick={()=>setElement('')}>顯示全部元件</button></div><table><thead><tr><th>元件 Element</th><th>I₁ (A)</th><th>I₂ (A)</th><th>I₃ (A)</th><th>P (kW)</th><th>Q (kvar)</th><th>損失 (kW)</th></tr></thead><tbody>{elements.filter(item=>!element||item.name===element).map(item=><tr key={item.name}><td>{item.name}</td>{[0,1,2].map(i=><td key={i}>{fmt(item.amps[i])}</td>)}<td>{fmt(item.kw)}</td><td>{fmt(item.kvar)}</td><td>{fmt(item.lossKW)}</td></tr>)}</tbody></table></>}
      {tab==='plot'&&<div className="voltage-plot"><div className="plot-description"><strong>匯流排節點電壓</strong><span><i className="phase-one"/>相 1 <i className="phase-two"/>相 2 <i className="phase-three"/>相 3</span><small>依模型匯流排順序排列 · p.u.</small></div><svg viewBox="0 0 800 132" role="img" aria-label="各匯流排三相電壓折線圖">{[plotMin,(plotMin+plotMax)/2,plotMax].map(value=><g key={value}><line x1="45" x2="780" y1={plotY(value)} y2={plotY(value)} stroke="#e7edf4"/><text x="2" y={plotY(value)+3}>{value.toFixed(2)}</text></g>)}{[.95,1.05].map(value=><line key={value} x1="45" x2="780" y1={plotY(value)} y2={plotY(value)} stroke="#dfb075" strokeDasharray="4 4"/>)}{[0,1,2].map(phase=><polyline key={phase} points={result.buses.flatMap((bus,i)=>bus.baseKV>0&&bus.nodes.includes(phase+1)?[(55+i/Math.max(1,result.buses.length-1)*700)+','+plotY(bus.pu[bus.nodes.indexOf(phase+1)])]:[]).join(' ')} fill="none" stroke={['#2b6fce','#14a38b','#d78d37'][phase]} strokeWidth="2"/>)}{result.buses.filter((_,i,list)=>i===0||i===list.length-1).map((bus,i)=><text key={bus.name} x={i?755:55} y="126" textAnchor="middle">{bus.name}</text>)}</svg></div>}
      {tab==='reports'&&(result.reports.length?<div className="reports-list">{result.reports.map(report=><details key={report.name}><summary><FileText size={13}/>{report.name}<button onClick={event=>{event.preventDefault();download(report.name,report.content);}}><Download size={13}/>下載</button></summary><pre>{report.content}</pre></details>)}</div>:<div className="inline-empty"><FileText size={18}/>可輸入 Solve，換行後輸入 Show Voltages LN Nodes，再執行指令以產生報表。</div>)}
    </div>:<div className="empty-results"><span className="empty-icon"><Gauge size={23}/></span><div><strong>從一個電路，開始分析</strong><p>開啟你的 .dss 模型，或按「編譯」執行範例。計算結果會顯示在這裡。</p></div><button disabled={busy} onClick={()=>run('compile')}><Braces size={14}/>編譯目前模型</button></div>}</section>}
    <footer className="status-bar"><span><i className={'status-dot '+(connected?'success':'')}/>{busy?'雲端計算中…':'就緒'}</span><span className="status-circuit">{result?'電路：'+result.circuit:'尚無作用中電路'}</span><span className="footer-right">{!showResults&&<button onClick={()=>setShowResults(true)}>顯示結果視窗</button>}<Cloud size={12}/>雲端運算<span className="footer-divider"/>OpenDSS-C<span className="footer-divider"/>繁體中文</span></footer>
    <dialog className="help-modal" ref={help}><button className="modal-close" aria-label="關閉說明" onClick={()=>help.current?.close()}><X size={19}/></button><span className="help-eyebrow">OPENDSS · WEB EDITION</span><h2>熟悉的 OpenDSS，現在在瀏覽器。</h2><p>此工作台保留原版功能表、工具列、模型腳本與主要指令視窗。計算由雲端的 OpenDSS-C WASM 引擎執行，無須保持 Mac 開機。</p><ol><li><strong>開啟模型</strong>：選擇 .dss 主檔與其引用檔案，或開啟整個模型資料夾。</li><li><strong>編譯 Compile</strong>：載入主檔，依序執行檔案內的指令。</li><li><strong>求解 Solve</strong>：套用額外指令，執行所選模式的潮流或故障分析。</li><li><strong>查看與匯出</strong>：使用結果分頁與「匯出」功能表；完整專案可下載後在另一裝置開啟。每次操作都重新載入主腳本；產生報表前請先執行 Solve。</li></ol><div className="help-note"><Info size={17}/><span>草稿只暫存於目前瀏覽器，各裝置不會自動同步。檔案只在按下編譯／求解後送至雲端計算，不作永久儲存。模型引用路徑須使用相對路徑。</span></div><p className="help-limit">這是移植預覽版，已以基礎潮流、故障分析與 IEEE 123 節點案例核對。尚未驗證所有元件與模擬模式。單次上限為 2 MB 模型、100 個檔案、2,000 個匯流排、5,000 個元件；不提供 COM、原生 DLL、外部系統命令與平行 Actor。範例參數僅供練習。</p><a href="https://opendss.epri.com/TheUserInterface.html" target="_blank" rel="noreferrer">OpenDSS 原版介面說明 ↗</a></dialog>
  </main>;
}
