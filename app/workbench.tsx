'use client';

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Activity, ArrowDownToLine, Braces, Check, CircleHelp, Cloud, Code2, Download, FilePlus2, FileText, FolderOpen, Gauge, Globe, Info, Loader2, Maximize2, Minimize2, Network, PanelRightClose, Play, Save, Search, Settings2, Terminal, X, Zap } from 'lucide-react';
import { example, type ModelFile, type Result } from '../lib/model';
import { detectLang, english, fullWidth, languages, legacyEncoding, translate, type Lang } from '../lib/i18n';
import { CircuitPlot, CurvePlot, ProfilePlot } from './plots';

type Tab = 'summary' | 'voltage' | 'current' | 'fault' | 'compare' | 'plot' | 'reports';
type Log = { time: string; message: string; kind: string };
type PlotView = 'voltage' | 'circuit' | 'profile' | 'curve';
const tabs: [Tab,string][] = [['summary','電路摘要'],['voltage','匯流排電壓'],['current','元件電流'],['fault','故障電流'],['compare','前後比較'],['plot','繪圖'],['reports','文字報表']];
const initialFiles = example;
const exampleFiles = () => example;
// 瀏覽器語言決定介面語言；手動選的語言只在瀏覽器語言沒變時沿用。
const browserLang = () => detectLang(navigator.languages?.length?navigator.languages:[navigator.language]);
function preferredLang():Lang {
  const browser=browserLang();
  try{const stored=JSON.parse(localStorage.getItem('opendss-lang')??'null');if(stored?.browser===browser&&languages.some(item=>item.code===stored.lang))return stored.lang;}catch{}
  return browser;
}
// 舊版預設範例（未修改的草稿）改載入新範例。
const retiredExamples = ['k8w4kf','1dilmmt'];
const textHash = (text:string) => {let x=5381;for(const c of text)x=(x*33+c.codePointAt(0)!)>>>0;return x.toString(36);};
const isRetiredExample = (files:ModelFile[]) => files.length===1&&files[0].name==='Demo_Feeder.dss'&&retiredExamples.includes(textHash(files[0].content));
// run:'sequence' 表示帶進來後直接依序執行全部腳本。
type Project={files:ModelFile[];entry:string;commands?:string;mode?:string;run?:string};
type SequenceRun={name:string;result:Result};
const isFaultRun=(result:Result)=>result.buses.some(bus=>bus.faultAmps.length>0);
// 會自己建立電路的腳本才算一支獨立程式；被 Redirect 的子檔不單獨執行。
const isCircuitScript=(file:ModelFile)=>/\.dss$/i.test(file.name)&&/^\s*new\s+circuit\./im.test(file.content);
function toCSV(rows:(string|number)[][]){return '\uFEFF'+rows.map(row=>row.map(value=>typeof value==='number'?String(value):'"'+(/^[=+@-]/.test(value)?"'":'')+value.replaceAll('"','""')+'"').join(',')).join('\r\n');}
const isProject=(project:Project|null|undefined):project is Project=>Array.isArray(project?.files)&&project.files.length>0&&project.files.length<=100&&project.files.every(file=>typeof file?.name==='string'&&typeof file.content==='string')&&project.files.some(file=>file.name===project.entry);
// 其他網站可用 window.open 開「/?import」，收到 opendss:ready 後以 postMessage 傳 {type:'opendss:project',project}；只收這些來源。
const importOrigins=/^(https:\/\/([a-z0-9-]+\.)*esperar-ai\.org|http:\/\/(localhost|127\.0\.0\.1)(:\d+)?)$/;
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
  const [entry,setEntry]=useState(initialFiles[0].name);
  const [active,setActive]=useState(initialFiles[0].name);
  const [lang,setLang]=useState<Lang>('zh-TW');
  const t=(text:string,...args:(string|number)[])=>translate(lang,text,...args);
  // 專業名詞在中文介面旁補英文。
  const term=(text:string)=>lang==='en'?t(text):<>{t(text)}{english[text]&&<small className="term-en">{english[text]}</small>}</>;
  const fmt=(value:number|undefined,digits=3)=>Number.isFinite(value)?value!.toLocaleString(lang,{minimumFractionDigits:digits,maximumFractionDigits:digits}):'—';
  function chooseLang(next:Lang){setLang(next);try{localStorage.setItem('opendss-lang',JSON.stringify({lang:next,browser:browserLang()}));}catch{}}
  const paren=(text:string,en:string)=>fullWidth(lang)?text+'（'+en+'）':text+' ('+en+')';
  const word=languages.find(item=>item.code===lang)!.word;
  const [commands,setCommands]=useState('');
  const [input,setInput]=useState('');
  const [mode,setMode]=useState('snapshot');
  const [result,setResult]=useState<Result|null>(null);
  const [stale,setStale]=useState(false);
  // 依序執行的結果：revision 記住執行時的檔案與模式，之後改了模型就標成過期。
  const [sequence,setSequence]=useState<{runs:SequenceRun[];revision:string}|null>(null);
  const [pair,setPair]=useState<[string,string]>(['','']);
  const [busy,setBusy]=useState(false);
  const [connection,setConnection]=useState('正在檢查雲端引擎');
  const [connected,setConnected]=useState(false);
  const [logs,setLogs]=useState<Log[]>([]);
  const [tab,setTab]=useState<Tab>('summary');
  const [plotView,setPlotView]=useState<PlotView>('voltage');
  const [showConsole,setShowConsole]=useState(true);
  const [showResults,setShowResults]=useState(true);
  // 版面放大：editor＝只留編輯區，results＝結果區佔滿；saved 記住放大前指令視窗與結果視窗的開關，還原時套回。
  const [layout,setLayout]=useState<'normal'|'editor'|'results'>('normal');
  const saved=useRef({console:true,results:true});
  // 放大編輯區後又從功能表叫出其他視窗，就算回到一般版面。
  const view=layout==='editor'&&(showConsole||showResults)?'normal':layout;
  const layoutRef=useRef(view);layoutRef.current=view;
  const restoreRef=useRef(()=>{});
  const [resultsHeight,setResultsHeight]=useState<number|null>(null);
  const [elementType,setElementType]=useState('All');
  const [element,setElement]=useState('');
  const [query,setQuery]=useState('');
  const [fontSize,setFontSize]=useState(13);
  const [caret,setCaret]=useState({line:1,column:1});
  const [restored,setRestored]=useState(false);
  // 頁面內確認列：桌面 App 內建瀏覽器不支援 window.confirm。
  const [pending,setPending]=useState<{message:string;apply:()=>void}|null>(null);
  const uploader=useRef<HTMLInputElement>(null), folder=useRef<HTMLInputElement>(null);
  const editor=useRef<HTMLTextAreaElement>(null), painted=useRef<HTMLPreElement>(null), gutter=useRef<HTMLDivElement>(null);
  const help=useRef<HTMLDialogElement>(null), logEnd=useRef<HTMLDivElement>(null);
  const source=files.find(file=>file.name===active)?.content??'';
  const revision=useRef('');
  revision.current=JSON.stringify({files,entry,commands,mode});
  function log(message:string,kind='info') {setLogs(prev=>[...prev.slice(-99),{time:new Date().toLocaleTimeString(lang,{hour12:false}),message,kind}]);}
  useEffect(()=>{
    setLang(preferredLang());
    const followBrowser=()=>setLang(preferredLang());
    window.addEventListener('languagechange',followBrowser);
    try {
      const saved=JSON.parse(localStorage.getItem('opendss-workspace-v1')??'null');
      if(saved?.files?.length && saved.files.every((file:ModelFile)=>typeof file.name==='string'&&typeof file.content==='string') && saved.files.some((file:ModelFile)=>file.name===saved.entry) && !isRetiredExample(saved.files)) {
        setFiles(saved.files);setEntry(saved.entry);setActive(saved.entry);setCommands(saved.commands??'');
      } else setFiles(exampleFiles());
    } catch {}
    try{const height=Number(localStorage.getItem('opendss-results-height'));if(height>=130)setResultsHeight(height);}catch{}
    setRestored(true);
    const controller=new AbortController();
    fetch('/api/engine',{signal:controller.signal}).then(async response=>{const data=await response.json() as {error?:string};setConnected(response.ok);setConnection(response.ok?'雲端引擎已連線':data.error??'引擎暫時無法連線');}).catch(()=>{if(!controller.signal.aborted)setConnection('引擎暫時無法連線');});
    return ()=>{controller.abort();window.removeEventListener('languagechange',followBrowser);};
  },[]);
  useEffect(()=>{
    if(!restored||!new URLSearchParams(location.search).has('import')||!window.opener)return;
    function receive(event:MessageEvent){
      if(!importOrigins.test(event.origin)||event.data?.type!=='opendss:project')return;
      const project=event.data.project as Project;
      if(!isProject(project)){log(t('專案檔格式錯誤。'),'error');return;}
      const sequential=project.run==='sequence'&&project.files.filter(isCircuitScript).length>1;
      ask(t(sequential?'{0} 傳來 {1} 個檔案，開啟後會依序執行全部腳本並列出前後電壓。開啟會取代此裝置的草稿，請先下載需要保留的模型。確定開啟？':'{0} 傳來 {1} 個檔案，主腳本：{2}。開啟會取代此裝置的草稿，請先下載需要保留的模型。確定開啟？',new URL(event.origin).host,project.files.length,project.entry),()=>{openProject(project);history.replaceState(null,'',location.pathname);if(sequential)runSequence(project.files,project.mode??'script');});
    }
    window.addEventListener('message',receive);
    window.opener.postMessage({type:'opendss:ready'},'*');
    return ()=>window.removeEventListener('message',receive);
  },[restored]);
  useEffect(()=>{if(resultsHeight)try{localStorage.setItem('opendss-results-height',String(resultsHeight));}catch{}},[resultsHeight]);
  useEffect(()=>{
    if(!restored)return;
    try{localStorage.setItem('opendss-workspace-v1',JSON.stringify({files,entry,commands}));}catch{log(t('瀏覽器儲存空間不足，請下載模型保留修改。'),'error');}
  },[files,entry,commands,restored]);
  useEffect(()=>{document.documentElement.lang=lang;document.title='OpenDSS · '+t('雲端工作台');},[lang]);
  useEffect(()=>{const panel=logEnd.current?.parentElement;if(panel)panel.scrollTop=panel.scrollHeight;},[logs]);
  useEffect(()=>{
    function key(event:KeyboardEvent){
      if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='s'){event.preventDefault();download(active,source);}
      if(event.key==='Escape'){document.querySelectorAll('.menu[open]').forEach(node=>node.removeAttribute('open'));if(layoutRef.current!=='normal'&&!document.querySelector('.menu[open], dialog[open]'))restoreRef.current();}
    }
    function close(event:MouseEvent){if(!(event.target as HTMLElement).closest('.menu-bar'))document.querySelectorAll('.menu[open]').forEach(node=>node.removeAttribute('open'));}
    window.addEventListener('keydown',key);window.addEventListener('click',close);
    return ()=>{window.removeEventListener('keydown',key);window.removeEventListener('click',close);};
  },[active,source]);
  async function run(action:'compile'|'solve'='solve',extra=commands,report=false){
    if(busy)return;
    // 功能表產生的報表只在指令後追加 Show／Export，不算改動模型。
    const submitted=JSON.stringify({files,entry,commands:action==='compile'||report?commands:extra,mode});
    setBusy(true);log(action==='compile'?t('正在編譯 {0}…',entry):t('正在執行{0}…',mode==='faultstudy'?t('故障分析'):mode==='script'?t('腳本指令'):t('穩態潮流')));
    try{
      const response=await fetch('/api/engine',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({files,entry,commands:action==='compile'?'':extra,analysis:mode,action}),signal:AbortSignal.timeout(60000)});
      const data=await response.json() as Result & {error?:string};
      if(!response.ok||data.error)throw Error(t(data.error??'計算失敗，請檢查模型。'));
      setResult(data);setStale(submitted!==revision.current);setConnected(true);setConnection('雲端引擎已連線');setElement('');setShowResults(true);
      if(mode==='faultstudy'&&action==='solve')setTab('fault');
      log((action==='compile'?t('編譯完成'):t('計算完成'))+t('｜')+data.circuit+t('｜')+(data.converged?t('已收斂'):t('尚未收斂'))+t('｜')+data.elapsedMS+' ms',data.converged?'success':'error');
      if(data.message)log(data.message);
    }catch(error){setStale(true);log(error instanceof Error?error.message:t('執行失敗，請重試。'),'error');}
    finally{setBusy(false);}
  }
  // 依序執行每支含 New Circuit 的腳本（例如故障電流、變動前、變動後），在「前後比較」列出各匯流排電壓與變動率。
  async function runSequence(list=files,analysis=mode){
    if(busy)return;
    const scripts=list.filter(isCircuitScript);
    if(scripts.length<2){log(t('依序執行需要至少兩支含 New Circuit 的腳本。'),'error');show('compare');return;}
    setBusy(true);
    const runs:SequenceRun[]=[];
    try{
      for(const [i,file] of scripts.entries()){
        log(t('依序執行 {0}/{1}：{2}…',i+1,scripts.length,file.name));
        const response=await fetch('/api/engine',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({files:list,entry:file.name,commands:'',analysis,action:'solve'}),signal:AbortSignal.timeout(60000)});
        const data=await response.json() as Result & {error?:string};
        if(!response.ok||data.error)throw Error(file.name+t('｜')+t(data.error??'計算失敗，請檢查模型。'));
        runs.push({name:file.name,result:data});
      }
      const voltage=runs.filter(run=>!isFaultRun(run.result));
      const before=voltage.find(run=>/before|變動前/i.test(run.name))?.name??voltage[0]?.name??'';
      const after=voltage.find(run=>run.name!==before&&/after|變動後/i.test(run.name))?.name??voltage.find(run=>run.name!==before)?.name??'';
      setSequence({runs,revision:JSON.stringify({files:list,mode:analysis})});setPair([before,after]);setConnected(true);setConnection('雲端引擎已連線');
      log(t('依序執行完成，共 {0} 支腳本。',runs.length),'success');show('compare');
    }catch(error){log(error instanceof Error?error.message:t('執行失敗，請重試。'),'error');}
    finally{setBusy(false);}
  }
  function viewRun(run:SequenceRun){setResult(run.result);setEntry(run.name);setActive(run.name);setStale(sequenceStale);setElement('');show(isFaultRun(run.result)?'fault':'voltage');}
  function exportCompare(){
    if(!changes.length)return;
    download((pair[1]||'compare').replace(/\.dss$/i,'')+'_compare.csv',toCSV([['Bus','Node','Before_pu','After_pu','Change_pct'],...changes.map(row=>[row.bus,row.node,row.before,row.after,row.pct])]),'text/csv;charset=utf-8');log(t('已匯出前後比較 CSV。'));
  }
  async function openFiles(list:FileList|null){
    if(!list?.length)return;
    try{
      if(list.length===1&&list[0].name.endsWith('.opendss.json')){
        const project=JSON.parse(await list[0].text()) as Project;
        if(!isProject(project))throw Error(t('專案檔格式錯誤。'));
        ask(t('開啟專案會取代此裝置的草稿。請先下載需要保留的模型。確定開啟？'),()=>openProject(project));return;
      }
      const selected=Array.from(list).filter(file=>/\.(dss|csv|txt|dat)$/i.test(file.name));
      if(selected.length>100||selected.reduce((sum,file)=>sum+file.size,0)>2*1024*1024)throw Error(t('上限為 100 個檔案、合計 2 MB。'));
      const imported=await Promise.all(selected.map(async file=>{
        const bytes=await file.arrayBuffer();let content;
        try{content=new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{content=new TextDecoder(legacyEncoding[lang]).decode(bytes);}
        return {name:file.webkitRelativePath?file.webkitRelativePath.split('/').slice(1).join('/'):file.name,content};
      }));
      const main=imported.find(file=>/master[^/]*\.dss$/i.test(file.name))??imported.find(file=>/\.dss$/i.test(file.name));
      if(!main)throw Error(t('至少需要一個 .dss 模型檔案。'));
      ask(t('開啟新模型會取代此裝置的草稿。請先下載需要保留的檔案。確定開啟？'),()=>{setFiles(imported);setEntry(main.name);setActive(main.name);setCommands('');setResult(null);setStale(false);log(t('已開啟 {0} 個檔案，主檔：{1}',imported.length,main.name));});
    }catch(error){log(error instanceof Error?error.message:t('讀取檔案失敗。'),'error');}
    finally{if(uploader.current)uploader.current.value='';if(folder.current)folder.current.value='';}
  }
  function ask(message:string,apply:()=>void){setPending({message,apply});}
  function openProject(project:Project){setSequence(null);setFiles(project.files);setEntry(project.entry);setActive(project.entry);setCommands(project.commands??'');if(project.mode&&['snapshot','faultstudy','script'].includes(project.mode))setMode(project.mode);setResult(null);setStale(false);log(t('已開啟專案。'));}
  function maximize(next:'editor'|'results'){
    if(view==='normal')saved.current={console:showConsole,results:showResults};
    setLayout(next);
    if(next==='editor'){setShowConsole(false);setShowResults(false);}else setShowResults(true);
  }
  function restoreLayout(){setLayout('normal');setShowConsole(saved.current.console);setShowResults(saved.current.results);}
  restoreRef.current=restoreLayout;
  // 拖曳編輯區與結果區之間的分隔線調整結果區高度，記在此裝置。
  function startResize(event:ReactPointerEvent<HTMLDivElement>){
    const panel=event.currentTarget.nextElementSibling as HTMLElement|null;if(!panel)return;
    event.preventDefault();
    const startY=event.clientY,startHeight=panel.getBoundingClientRect().height;
    const move=(e:PointerEvent)=>setResultsHeight(Math.round(Math.min(Math.max(startHeight+startY-e.clientY,130),Math.max(window.innerHeight-220,startHeight,480))));
    const up=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);};
    window.addEventListener('pointermove',move);window.addEventListener('pointerup',up);
  }
  function show(next:Tab){setTab(next);setShowResults(true);}
  function plot(view:PlotView){setPlotView(view);show('plot');}
  function exportCSV(){
    if(!result||stale)return;
    const rows:(string|number)[][]=[['Bus','BasekV_LN','Node','Volts','pu','Fault_A']];
    for(const bus of result.buses)bus.nodes.forEach((node,i)=>rows.push([bus.name,bus.baseKV,node,bus.volts[i]??'',bus.pu[i]??'',bus.faultAmps[i]??'']));
    download(result.circuit+'_voltages.csv',toCSV(rows),'text/csv;charset=utf-8');log(t('已匯出匯流排電壓 CSV。'));
  }
  function newModel(){ask(t('建立新模型會取代此裝置的草稿，確定繼續？'),()=>{const name='Untitled.dss';setFiles([{name,content:'Clear\nNew Circuit.Untitled BasekV=11.4 pu=1.0 Phases=3\n\nSet VoltageBases=[11.4]\nCalcVoltageBases\nSolve\n'}]);setEntry(name);setActive(name);setCommands('');setResult(null);log(t('已建立新模型。'));});}
  function restoreExample(){ask(t('載入範例會取代此裝置的草稿，確定繼續？'),()=>{setFiles(exampleFiles());setEntry(initialFiles[0].name);setActive(initialFiles[0].name);setCommands('');setResult(null);log(t('已載入 IEEE 13 節點測試饋線範例。'));});}
  function selectLine(){const area=editor.current;if(!area)return;const before=source.slice(0,area.selectionStart);const selected=source.slice(area.selectionStart,area.selectionEnd)||source.split('\n')[before.split('\n').length-1];setCommands(prev=>prev+'\n'+selected+'\n');setShowConsole(true);log(t('已將選取內容加入主要指令視窗，請確認後執行。'));}
  function queue(lines:string){setCommands(prev=>prev.trimEnd()+'\n'+lines+'\n');setShowConsole(true);log(t('已將 {0} 加入主要指令視窗，請按「執行指令」。',lines.split('\n')[0]));}
  function setScriptMode(name:string){setMode('script');setStale(!!result);queue('Set Mode='+name+'\nSolve');}
  async function runReport(line:string){await run('solve',commands+'\nSolve\n'+line,true);show('reports');}
  const showOptions=[['Voltages LN Nodes',t('節點電壓')],['Currents',t('元件電流')],['Powers kVA Elements',t('元件功率')],['Losses',t('損失')],['Faults',t('故障電流')],['Taps',t('變壓器分接頭')],['Overloads',t('過載元件')],['Unserved',t('未供電負載')],['Meters',t('電度表')],['Generators',t('發電機')],['Convergence',t('收斂情形')],['Isolated',t('孤立匯流排')],['Elements',t('元件清單')],['Buses',t('匯流排清單')],['Mismatch',t('功率不平衡')],['kVBaseMismatch',t('電壓基準不符')],['Variables',t('狀態變數')],['Yprim',t('元件 Y 矩陣')],['EventLog',t('事件紀錄')],['Zone',t('保護區域')],['Ratings',t('額定值')],['Loops',t('迴路')]];
  const exportOptions=[['Voltages',t('匯流排電壓')],['SeqVoltages',t('序電壓')],['Currents',t('元件電流')],['SeqCurrents',t('序電流')],['Powers',t('元件功率')],['Losses',t('元件損失')],['Summary',t('電路摘要')],['FaultStudy',t('故障電流')],['Loads',t('負載')],['Generators',t('發電機')],['Capacity',t('饋線容量')],['Overloads',t('過載元件')],['Unserved',t('未供電負載')],['Meters',t('電度表')],['Taps',t('分接頭')],['Profile',t('電壓剖面')],['Buscoords',t('匯流排座標')],['NodeNames',t('節點名稱')],['Y',t('系統 Y 矩陣')],['Counts',t('元件數量')]];
  const solveModes=[['Daily',t('日負載（Daily）')],['Yearly',t('年負載（Yearly）')],['Duty',t('工作週期（DutyCycle）')],['Harmonics',t('諧波（Harmonics）')],['Dynamics',t('動態（Dynamics）')],['Direct',t('直接解（Direct）')],['M1',t('蒙地卡羅（MonteCarlo1）')],['PeakDay',t('尖峰日（PeakDay）')]];
  const menus:[string,string,[string,()=>void,boolean?][]][]=[
    [t('檔案'),'File',[[t('新增模型'),newModel],[t('開啟檔案…'),()=>uploader.current?.click()],[t('開啟模型資料夾…'),()=>folder.current?.click()],[t('下載目前檔案'),()=>download(active,source)],[t('下載完整專案'),()=>download('Project.opendss.json',JSON.stringify({files,entry,commands},null,2),'application/json')],[t('儲存電路（Save Circuit）'),()=>runReport('Save Circuit Dir=saved'),busy]]],
    [t('編輯'),'Edit',[[t('選取全部'),()=>{editor.current?.focus();editor.current?.select();}],[t('放大字體'),()=>setFontSize(size=>Math.min(20,size+1))],[t('縮小字體'),()=>setFontSize(size=>Math.max(11,size-1))]]],
    [t('執行'),'Do',[[t('編譯主檔（Compile）'),()=>run('compile'),busy],[t('求解（Solve）'),()=>run(),busy],[t('依序執行全部腳本（前後比較）'),()=>runSequence(),busy],[t('選取內容加入指令視窗'),selectLine]]],
    [t('設定'),'Set',[[t('穩態潮流（Snapshot）'),()=>{setMode('snapshot');setStale(!!result);}],[t('故障分析（FaultStudy）'),()=>{setMode('faultstudy');setStale(!!result);}],[t('依腳本設定（不另外求解）'),()=>{setMode('script');setStale(!!result);}],...solveModes.map(([key,label])=>[t('加入：')+label,()=>setScriptMode(key)] as [string,()=>void])]],
    [t('建立'),'Make',[[t('新增空白模型'),newModel],[t('載入配電範例'),restoreExample]]],
    [t('匯出'),'Export',[[t('匯流排電壓 CSV'),exportCSV,!result||stale],[t('完整計算結果 JSON'),()=>result&&download(result.circuit+'_results.json',JSON.stringify(result,null,2),'application/json'),!result||stale],...exportOptions.map(([key,label])=>[paren(label,'Export '+key),()=>runReport('Export '+key),busy] as [string,()=>void,boolean])]],
    [t('顯示'),'Show',[...tabs.filter(([key])=>key!=='plot').map(([key,name])=>[t(name),()=>show(key)] as [string,()=>void]),...showOptions.map(([key,label])=>[paren(label,'Show '+key),()=>runReport('Show '+key),busy] as [string,()=>void,boolean])]],
    [t('視覺化'),'Visualize',[[t('目前元件的電流與功率'),()=>show('current')]]],
    [t('繪圖'),'Plot',[[t('匯流排電壓圖'),()=>plot('voltage')],[t('電路圖（Plot Circuit）'),()=>plot('circuit')],[t('電壓剖面（Plot Profile）'),()=>plot('profile')],[t('曲線圖（Plot Monitor）'),()=>plot('curve')]]],
    [t('重設'),'Reset',[[t('清除計算結果'),()=>{setResult(null);log(t('已清除計算結果。'));}],[t('清除執行紀錄'),()=>setLogs([])]]],
    [t('視窗'),'Window',[[showConsole?t('隱藏主要指令視窗'):t('顯示主要指令視窗'),()=>setShowConsole(value=>!value)],[showResults?t('隱藏結果視窗'):t('顯示結果視窗'),()=>setShowResults(value=>!value)],...languages.map(item=>[(item.code===lang?'✓ ':'')+(lang==='en'?'Language: ':word+' Language'+(fullWidth(lang)?'：':': '))+item.name,()=>chooseLang(item.code)] as [string,()=>void])]],
    [t('說明'),'Help',[[t('使用說明與指令對照'),()=>help.current?.showModal()],[t('OpenDSS 官方文件 ↗'),()=>window.open('https://opendss.epri.com/','_blank','noopener,noreferrer')]]]
  ];
  const voltageRuns=sequence?.runs.filter(run=>!isFaultRun(run.result))??[];
  const sequenceStale=!!sequence&&sequence.revision!==JSON.stringify({files,mode});
  const beforeRun=voltageRuns.find(run=>run.name===pair[0]),afterRun=voltageRuns.find(run=>run.name===pair[1]);
  // 變動率 =（變動後 − 變動前）÷ 變動前 × 100%，逐一比對同名匯流排的相節點 1–3。
  const changes=beforeRun&&afterRun&&beforeRun!==afterRun?beforeRun.result.buses.flatMap(bus=>{
    const other=afterRun.result.buses.find(item=>item.name.toLowerCase()===bus.name.toLowerCase());
    if(!other||!(bus.baseKV>0))return [];
    return bus.nodes.flatMap((node,i)=>{const j=other.nodes.indexOf(node),before=bus.pu[i],after=other.pu[j];return node>=1&&node<=3&&j>=0&&before>0?[{bus:bus.name,node,before,after,pct:(after-before)/before*100}]:[];});
  }):[];
  const worst=changes.reduce<(typeof changes)[number]|undefined>((max,row)=>!max||Math.abs(row.pct)>Math.abs(max.pct)?row:max,undefined);
  const elements=result?.elements.filter(item=>elementType==='All'||item.name.toLowerCase().startsWith(elementType.toLowerCase()+'.'))??[];
  const buses=result?.buses.filter(bus=>bus.name.toLowerCase().includes(query.toLowerCase()))??[];
  const volts=result?.buses.flatMap(bus=>bus.pu.filter((_,i)=>bus.nodes[i]>=1&&bus.nodes[i]<=3&&bus.baseKV>0))??[];
  const minPU=volts.length?Math.min(...volts):undefined,maxPU=volts.length?Math.max(...volts):undefined;
  const plotMin=Math.min(.94,minPU??.94),plotMax=Math.max(1.06,maxPU??1.06),plotY=(value:number)=>108-(value-plotMin)/(plotMax-plotMin)*95;
  return <main className={'workbench'+(view==='results'?' results-max':'')}>
    <input ref={uploader} type="file" multiple accept=".dss,.csv,.txt,.dat,.json" hidden onChange={event=>openFiles(event.target.files)}/>
    <input ref={folder} type="file" multiple hidden {...{webkitdirectory:''}} onChange={event=>openFiles(event.target.files)}/>
    <header className="title-bar"><div className="app-brand"><span className="app-mark"><Zap size={18} fill="currentColor"/></span><h1>OpenDSS</h1><span className="brand-divider"/><span className="edition">{t('雲端工作台')}</span><span className="version-badge">WEB PREVIEW</span></div><div className="title-meta"><span className="no-login">{t('免登入使用')}</span><label className="language-picker"><Globe size={14}/><span className="language-label">{lang==='en'?'Language':word+' Language'}</span><select aria-label="Language / 語言" value={lang} onChange={event=>chooseLang(event.target.value as Lang)}>{languages.map(item=><option key={item.code} value={item.code}>{item.name}</option>)}</select></label><button aria-label={t('使用說明')} onClick={()=>help.current?.showModal()}><CircleHelp size={17}/></button></div></header>
    {pending&&<div className="confirm-bar" role="alertdialog" aria-label={t('確認')}><p>{pending.message}</p><div><button onClick={()=>download('Project.opendss.json',JSON.stringify({files,entry,commands},null,2),'application/json')}>{t('下載完整專案')}</button><button className="primary" onClick={()=>{pending.apply();setPending(null);}}>{t('確定')}</button><button onClick={()=>setPending(null)}>{t('取消')}</button></div></div>}
    <nav className="menu-bar" aria-label={t('主要功能表')}>{menus.map(([name,en,items])=><details className="menu" key={name}><summary title={en} onClick={event=>{const current=event.currentTarget.parentElement;document.querySelectorAll('.menu[open]').forEach(node=>{if(node!==current)node.removeAttribute('open');});}}>{name}</summary><div className="menu-popup">{items.map(([label,action,disabled])=><button key={label} disabled={disabled} onClick={event=>{event.currentTarget.closest('details')?.removeAttribute('open');action();}}>{label}</button>)}</div></details>)}<span className="menu-end">{t('熟悉的指令，熟悉的工作流程')}</span></nav>
    <div className="toolbar" role="toolbar" aria-label={t('常用工具')}><div className="tool-group"><button title={t('新增模型')} aria-label={t('新增模型')} onClick={newModel}><FilePlus2/></button><button title={t('開啟檔案')} aria-label={t('開啟檔案')} onClick={()=>uploader.current?.click()}><FolderOpen/></button><button title={t('下載目前檔案（⌘/Ctrl+S）')} aria-label={t('下載目前檔案')} onClick={()=>download(active,source)}><Save/></button></div><div className="tool-group"><button className="tool-label" disabled={busy} title={t('Compile：載入並執行主檔')} aria-label={t('編譯')} onClick={()=>run('compile')}><Braces/><span>{t('編譯')}</span></button><button className="solve-button" disabled={busy} onClick={()=>run()}>{busy?<Loader2 className="spin"/>:<Play fill="currentColor"/>}<span>{busy?t('執行中'):t('求解')}</span></button></div><div className="tool-group"><button className="tool-label" aria-label={t('摘要')} onClick={()=>show('summary')}><FileText/><span>{t('摘要')}</span></button><button className="tool-label" aria-label={t('繪圖')} onClick={()=>show('plot')}><Activity/><span>{t('繪圖')}</span></button><button className="tool-label" aria-label={t('匯出')} disabled={!result||stale} onClick={exportCSV}><ArrowDownToLine/><span>{t('匯出')}</span></button></div><div className="toolbar-spacer"/><button className="tool-label console-toggle" title={t('切換主要指令視窗')} aria-label={t('切換主要指令視窗')} onClick={()=>setShowConsole(value=>!value)}><Terminal/><span>{t('指令視窗')}</span></button><span className={'cloud-status '+(connected?'online':'')} title={t(connection)}><Cloud size={15}/><span>{connected?t('雲端已連線'):t(connection)}</span><i/></span></div>
    <div className="selector-row"><div className="selector"><Network size={15}/><label htmlFor="element-type">{term('元件類型')}</label><select id="element-type" value={elementType} onChange={event=>{setElementType(event.target.value);setElement('');}}><option value="All">{t('全部元件')}</option>{[['Vsource',t('電壓源')],['Transformer',t('變壓器')],['Line',t('線路')],['Load',t('負載')],['PVSystem',t('太陽光電')],['Generator',t('發電機')]].map(([value,label])=><option key={value} value={value}>{label} · {value}</option>)}</select><select aria-label={t('選取電路元件')} value={element} onChange={event=>setElement(event.target.value)}><option value="">{result?t('選取元件…'):t('請先編譯模型')}</option>{elements.map(item=><option key={item.name}>{item.name}</option>)}</select><button disabled={!result} title={t('顯示元件資訊')} aria-label={t('顯示元件資訊')} onClick={()=>show('current')}><Info size={16}/></button></div><div className="selector analysis"><Settings2 size={15}/><label htmlFor="analysis">{term('求解模式')}</label><select id="analysis" value={mode} onChange={event=>{setMode(event.target.value);setStale(!!result);}}><option value="snapshot">{t('穩態潮流 · Snapshot')}</option><option value="faultstudy">{t('故障分析 · FaultStudy')}</option><option value="script">{t('依腳本設定 · Set Mode')}</option></select><span className="frequency">{result?.frequency??60} Hz</span></div></div>
    <div className="script-row"><Code2 size={15}/><label htmlFor="entry">{t('主腳本')}</label><select id="entry" value={entry} onChange={event=>{setEntry(event.target.value);setActive(event.target.value);setStale(!!result);}}>{files.filter(file=>/\.dss$/i.test(file.name)).map(file=><option key={file.name}>{file.name}</option>)}</select><button title={t('編譯主腳本')} aria-label={t('編譯主腳本')} disabled={busy} onClick={()=>run('compile')}><Braces size={15}/></button><span className="draft-label"><Check size={13}/>{t('草稿暫存於此裝置')}</span><span className="file-count">{t('{0} 個檔案',files.length)}</span></div>
    <div className={'result-strip '+(result&&!stale?'has-result':'')} role="status"><span className="result-label">{t('結果')}</span>{busy?<><Loader2 size={13} className="spin"/><span>{t('雲端引擎正在執行模型…')}</span></>:result?<><span className={'status-dot '+(stale?'warning':result.converged?'success':'error')}/><strong>{stale?t('模型已變更，請重新求解'):result.converged?t('計算收斂'):t('計算尚未收斂')}</strong><span className="strip-detail">{result.circuit} · {t('{0} 個匯流排 · {1} 個元件',result.buses.length,result.elements.length)}</span><span className="strip-time">{result.elapsedMS} ms</span></>:<><span className="status-dot"/><span>{t('尚未編譯模型。開啟 .dss 主檔，或直接編譯目前範例。')}</span></>}</div>
    <div className={'editor-workspace '+(!showConsole?'console-hidden':'')}><section className="script-editor" aria-label={t('模型腳本編輯器')}><div className="panel-heading"><span><Code2 size={14}/>{t('模型腳本')}</span><div className="panel-actions"><button aria-label={t('縮小字體')} onClick={()=>setFontSize(size=>Math.max(11,size-1))}>A−</button><button aria-label={t('放大字體')} onClick={()=>setFontSize(size=>Math.min(20,size+1))}>A+</button><button title={view==='editor'?t('還原版面'):t('放大編輯區')} aria-label={view==='editor'?t('還原版面'):t('放大編輯區')} onClick={()=>view==='editor'?restoreLayout():maximize('editor')}>{view==='editor'?<Minimize2 size={13}/>:<Maximize2 size={13}/>}</button></div></div><div className="file-tabs" role="tablist" aria-label={t('已開啟檔案')}>{files.map(file=><button role="tab" aria-selected={active===file.name} className={active===file.name?'selected':''} key={file.name} onClick={()=>setActive(file.name)}><FileText size={13}/>{file.name}{entry===file.name&&<span className="entry-dot" title={t('主腳本')}/>}</button>)}</div><div className="code-editor" style={{fontSize}}><div className="line-numbers" ref={gutter} aria-hidden="true">{source.split('\n').map((_,i)=><div key={i}>{i+1}</div>)}</div><div className="code-surface"><pre ref={painted} aria-hidden="true">{source.split('\n').map((line,i)=><div key={i}>{paint(line)}{'\n'}</div>)}</pre><textarea ref={editor} aria-label={t('DSS 模型內容')} value={source} spellCheck={false} wrap="off" onChange={event=>{const content=event.target.value;setFiles(prev=>prev.map(file=>file.name===active?{...file,content}:file));setStale(!!result);}} onScroll={event=>{if(painted.current){painted.current.scrollTop=event.currentTarget.scrollTop;painted.current.scrollLeft=event.currentTarget.scrollLeft;}if(gutter.current)gutter.current.scrollTop=event.currentTarget.scrollTop;}} onSelect={()=>{const before=source.slice(0,editor.current?.selectionStart??0).split('\n');setCaret({line:before.length,column:before.at(-1)!.length+1});}}/></div></div><div className="editor-footer"><span>{t('DSS 腳本 · UTF-8')}</span><span>{t('第 {0} 行，第 {1} 欄',caret.line,caret.column)}</span></div></section>
    {showConsole&&<section className="console-panel" aria-label={t('主要指令視窗')}><div className="panel-heading"><span><Terminal size={14}/>{t('主要指令視窗')}</span><button title={t('隱藏指令視窗')} aria-label={t('隱藏指令視窗')} onClick={()=>setShowConsole(false)}><PanelRightClose size={14}/></button></div><div className="scratch-caption">Main Script Window <span>{t('額外指令')}</span></div><textarea className="scratch-editor" aria-label={t('額外 DSS 指令')} placeholder={t('額外指令可輸入於此，再按「執行指令」。例如：Edit Load.671 kW=1000')} value={commands} spellCheck={false} onChange={event=>{setCommands(event.target.value);setStale(!!result);}}/><div className="scratch-actions"><span><i/>{t('套用於目前主腳本')}</span><button disabled={busy} onClick={()=>run()}><Play size={11} fill="currentColor"/>{t('執行指令')}</button></div><div className="console-log-heading"><span>{t('執行紀錄')}</span><button onClick={()=>setLogs([])}>{t('清除')}</button></div><div className="console-log" role="log" aria-label={t('執行紀錄')}>{logs.length?logs.map((line,i)=><div className={'log-line '+line.kind} key={i}><time>{line.time}</time><span>{line.message}</span></div>):<div className="log-welcome"><Terminal size={22}/><span>{t('已準備就緒')}</span><p>{t('編譯模型後，執行紀錄會顯示於此。')}</p></div>}<div ref={logEnd}/></div><form className="command-input" onSubmit={event=>{event.preventDefault();if(!input.trim()||busy)return;const next=commands+'\n'+input+'\n';setCommands(next);setInput('');run('solve',next);}}><span>›</span><input aria-label={t('輸入單行 DSS 指令')} placeholder={t('輸入指令，例如 Summary')} value={input} onChange={event=>setInput(event.target.value)}/><button disabled={busy||!input.trim()} aria-label={t('送出指令')}><ArrowDownToLine size={14} className="send-arrow"/></button></form></section>}</div>
    {showResults&&view!=='results'&&<div className="panel-splitter" role="separator" aria-orientation="horizontal" aria-label={t('拖曳調整結果視窗高度')} onPointerDown={startResize}/>}
    {showResults&&<section className="results-panel" style={view==='normal'&&resultsHeight?{height:resultsHeight}:undefined} aria-label={t('計算結果')}><div className="results-top"><div className="result-tabs" role="tablist" aria-label={t('結果分類')}>{tabs.map(([key,name])=><button role="tab" aria-selected={tab===key} key={key} className={tab===key?'selected':''} onClick={()=>setTab(key)}>{term(name)}</button>)}</div><div className="results-actions"><button title={view==='results'?t('還原版面'):t('放大結果視窗')} aria-label={view==='results'?t('還原版面'):t('放大結果視窗')} onClick={()=>view==='results'?restoreLayout():maximize('results')}>{view==='results'?<Minimize2 size={14}/>:<Maximize2 size={14}/>}</button><button className="collapse-results" aria-label={t('隱藏結果視窗')} onClick={()=>{setShowResults(false);if(view==='results')setLayout('normal');}}><X size={14}/></button></div></div>{tab==='compare'?<div className={'result-content compare-content '+(sequenceStale?'stale':'')}>{sequence?<>
      <div className="sequence-runs">{sequence.runs.map((run,i)=><button key={run.name} title={t('檢視這支腳本的結果')} onClick={()=>viewRun(run)}><b>{i+1}</b><span>{run.name}</span><small>{isFaultRun(run.result)?t('故障電流'):t('電壓')} · {run.result.converged?t('已收斂'):t('尚未收斂')}</small></button>)}</div>
      {sequenceStale&&<div className="sequence-stale"><Info size={14}/>{t('模型已變更，請重新依序執行。')}<button disabled={busy} onClick={()=>runSequence()}>{t('重新依序執行')}</button></div>}
      <div className="table-tools compare-tools"><label>{t('變動前')}<select value={pair[0]} onChange={event=>setPair([event.target.value,pair[1]])}>{voltageRuns.map(run=><option key={run.name}>{run.name}</option>)}</select></label><label>{t('變動後')}<select value={pair[1]} onChange={event=>setPair([pair[0],event.target.value])}>{voltageRuns.map(run=><option key={run.name}>{run.name}</option>)}</select></label>{worst&&<strong className="compare-worst">{t('最大變動率 {0}%（{1}）',fmt(worst.pct,3),worst.bus+'.'+worst.node)}</strong>}<label><Search size={13}/><input aria-label={t('搜尋匯流排')} placeholder={t('搜尋匯流排…')} value={query} onChange={event=>setQuery(event.target.value)}/></label><button disabled={!changes.length} onClick={exportCompare}><ArrowDownToLine size={13}/>CSV</button></div>
      {changes.length?<table className="compare-table"><thead><tr><th>{t('匯流排 Bus')}</th><th>{t('節點')}</th><th>{t('變動前 (p.u.)')}</th><th>{t('變動後 (p.u.)')}</th><th>{t('變動率 (%)')}</th></tr></thead><tbody>{changes.filter(row=>row.bus.toLowerCase().includes(query.toLowerCase())).map(row=><tr key={row.bus+'.'+row.node} className={row===worst?'worst':''}><td>{row.bus}</td><td>{row.node}</td><td>{fmt(row.before,5)}</td><td>{fmt(row.after,5)}</td><td>{fmt(row.pct,3)}</td></tr>)}</tbody></table>:<div className="inline-empty"><Info size={17}/>{t('請選兩支不同的電壓結果（非故障分析）來比較。')}</div>}
    </>:<div className="inline-empty sequence-empty"><Info size={17}/><span>{t('依序執行專案中每支含 New Circuit 的腳本，列出各匯流排變動前後電壓與變動率。')}</span><button disabled={busy} onClick={()=>runSequence()}><Play size={13}/>{t('依序執行全部腳本')}</button></div>}</div>:result?<div className={'result-content '+(stale?'stale':'')}>
      {tab==='summary'&&<div className="summary-grid"><div><span>{term('作用中電路')}</span><strong className="circuit-name">{result.circuit}</strong><small>{result.mode} · {result.frequency} Hz</small></div><div><span>{term('電源供電')}</span><strong>{fmt(result.power[0])}<em>kW</em></strong><small>{fmt(result.power[1])} kvar</small></div><div><span>{term('總有功損失')}</span><strong>{fmt(result.losses[0])}<em>kW</em></strong><small>{result.power[0]?fmt(result.losses[0]/Math.abs(result.power[0])*100):'—'}{t('% 佔電源供電')}</small></div><div><span>{t('相電壓範圍（節點 1–3）')}</span><strong>{fmt(minPU,4)}<em>– {fmt(maxPU,4)} p.u.</em></strong><small>{t('{0} 匯流排 · {1} 次迭代',result.buses.length,result.iterations)}</small></div></div>}
      {(tab==='voltage'||tab==='fault')&&<><div className="table-tools"><span>{tab==='fault'?t('各匯流排三相短路電流'):t('相對中性點電壓 · BasekV 為相電壓')}</span><label><Search size={13}/><input aria-label={t('搜尋匯流排')} placeholder={t('搜尋匯流排…')} value={query} onChange={event=>setQuery(event.target.value)}/></label></div>{tab==='fault'&&!result.buses.some(bus=>bus.faultAmps.length)?<div className="inline-empty"><Info size={17}/>{t('請將求解模式設為「故障分析」，再按「求解」。')}</div>:<table><thead><tr><th>{t('匯流排 Bus')}</th><th>{t('BasekV（L-N）')}</th>{[1,2,3].map(node=><th key={node}>{t('節點 {0}',node)} {tab==='fault'?'(A)':'(p.u.)'}</th>)}</tr></thead><tbody>{buses.map(bus=><tr key={bus.name}><td>{bus.name}</td><td>{fmt(bus.baseKV)}</td>{[1,2,3].map(node=>{const value=(tab==='fault'?bus.faultAmps:bus.pu)[bus.nodes.indexOf(node)];return <td key={node} className={tab==='voltage'&&value!==undefined&&(value<.95||value>1.05)?'violation':''}>{fmt(value,tab==='fault'?1:5)}</td>;})}</tr>)}</tbody></table>}</>}
      {tab==='current'&&<><div className="table-tools"><span>{t('第一端電流與流入元件的功率 · 負值表示流出')}</span><button onClick={()=>setElement('')}>{t('顯示全部元件')}</button></div><table><thead><tr><th>{t('元件 Element')}</th><th>I₁ (A)</th><th>I₂ (A)</th><th>I₃ (A)</th><th>P (kW)</th><th>Q (kvar)</th><th>{t('損失 (kW)')}</th></tr></thead><tbody>{elements.filter(item=>!element||item.name===element).map(item=><tr key={item.name}><td>{item.name}</td>{[0,1,2].map(i=><td key={i}>{fmt(item.amps[i])}</td>)}<td>{fmt(item.kw)}</td><td>{fmt(item.kvar)}</td><td>{fmt(item.lossKW)}</td></tr>)}</tbody></table></>}
      {tab==='plot'&&<><div className="plot-views" role="tablist" aria-label={t('繪圖類型')}>{([['voltage','匯流排電壓'],['circuit','電路圖'],['profile','電壓剖面'],['curve','曲線圖']] as [PlotView,string][]).map(([key,name])=><button role="tab" key={key} aria-selected={plotView===key} className={plotView===key?'selected':''} onClick={()=>setPlotView(key)}>{term(name)}</button>)}</div>
      {plotView==='voltage'&&<div className="voltage-plot"><div className="plot-description"><strong>{t('匯流排節點電壓')}</strong><span><i className="phase-one"/>{t('相 1')} <i className="phase-two"/>{t('相 2')} <i className="phase-three"/>{t('相 3')}</span><small>{t('依模型匯流排順序排列 · p.u.')}</small></div><svg viewBox="0 0 800 132" role="img" aria-label={t('各匯流排三相電壓折線圖')}>{[plotMin,(plotMin+plotMax)/2,plotMax].map(value=><g key={value}><line x1="45" x2="780" y1={plotY(value)} y2={plotY(value)} stroke="#e7edf4"/><text x="2" y={plotY(value)+3}>{value.toFixed(2)}</text></g>)}{[.95,1.05].map(value=><line key={value} x1="45" x2="780" y1={plotY(value)} y2={plotY(value)} stroke="#dfb075" strokeDasharray="4 4"/>)}{[0,1,2].map(phase=><polyline key={phase} points={result.buses.flatMap((bus,i)=>bus.baseKV>0&&bus.nodes.includes(phase+1)?[(55+i/Math.max(1,result.buses.length-1)*700)+','+plotY(bus.pu[bus.nodes.indexOf(phase+1)])]:[]).join(' ')} fill="none" stroke={['#2b6fce','#14a38b','#d78d37'][phase]} strokeWidth="2"/>)}{result.buses.filter((_,i,list)=>i===0||i===list.length-1).map((bus,i)=><text key={bus.name} x={i?755:55} y="126" textAnchor="middle">{bus.name}</text>)}</svg></div>}
      {plotView==='circuit'&&<CircuitPlot result={result} t={t}/>}
      {plotView==='profile'&&<ProfilePlot result={result} t={t}/>}
      {plotView==='curve'&&<CurvePlot result={result} t={t}/>}</>}
      {tab==='reports'&&(result.reports.length?<div className="reports-list">{result.reports.map(report=><details key={report.name}><summary><FileText size={13}/>{report.name}<button onClick={event=>{event.preventDefault();download(report.name,report.content);}}><Download size={13}/>{t('下載')}</button></summary><pre>{report.content}</pre></details>)}</div>:<div className="inline-empty"><FileText size={18}/>{t('可輸入 Solve，換行後輸入 Show Voltages LN Nodes，再執行指令以產生報表。')}</div>)}
    </div>:<div className="empty-results"><span className="empty-icon"><Gauge size={23}/></span><div><strong>{t('從一個電路，開始分析')}</strong><p>{t('開啟你的 .dss 模型，或按「編譯」執行範例。計算結果會顯示在這裡。')}</p></div><button disabled={busy} onClick={()=>run('compile')}><Braces size={14}/>{t('編譯目前模型')}</button></div>}</section>}
    <footer className="status-bar"><span><i className={'status-dot '+(connected?'success':'')}/>{busy?t('雲端計算中…'):t('就緒')}</span><span className="status-circuit">{result?t('電路：')+result.circuit:t('尚無作用中電路')}</span><span className="footer-right">{!showResults&&<button onClick={()=>setShowResults(true)}>{t('顯示結果視窗')}</button>}<Cloud size={12}/>{t('雲端運算')}<span className="footer-divider"/>OpenDSS-C<span className="footer-divider"/>{languages.find(item=>item.code===lang)?.name}</span></footer>
    <dialog className="help-modal" ref={help}><button className="modal-close" aria-label={t('關閉說明')} onClick={()=>help.current?.close()}><X size={19}/></button><span className="help-eyebrow">OPENDSS · WEB EDITION</span><h2>{t('熟悉的 OpenDSS，現在在瀏覽器。')}</h2><p>{t('此工作台保留原版功能表、工具列、模型腳本與主要指令視窗。計算由雲端的 OpenDSS-C WASM 引擎執行，不需要在自己的電腦上安裝任何程式。')}</p><ol><li><strong>{t('開啟模型')}</strong>{t('：選擇 .dss 主檔與其引用檔案，或開啟整個模型資料夾。')}</li><li><strong>{t('編譯 Compile')}</strong>{t('：載入主檔，依序執行檔案內的指令。')}</li><li><strong>{t('求解 Solve')}</strong>{t('：套用額外指令，執行所選模式的潮流或故障分析。選「依腳本設定」時不另外求解，Daily、Harmonics 等模式請用「設定」功能表加入 Set Mode 與 Solve。')}</li><li><strong>{t('查看與匯出')}</strong>{t('：使用結果分頁，或從「顯示」「匯出」功能表直接產生官方 Show／Export 報表，「檔案 → 儲存電路」可取回 Save Circuit 的 .dss；完整專案可下載後在另一裝置開啟。每次操作都重新載入主腳本；產生報表前請先執行 Solve。')}</li></ol><div className="help-note"><Info size={17}/><span>{t('草稿只暫存於目前瀏覽器，各裝置不會自動同步。檔案只在按下編譯／求解後送至雲端計算，不作永久儲存。模型引用路徑須使用相對路徑。')}</span></div><p className="help-limit">{t('這是移植預覽版，已以基礎潮流、故障分析與 IEEE 123 節點案例核對。尚未驗證所有元件與模擬模式。單次上限為 2 MB 模型、100 個檔案、2,000 個匯流排、5,000 個元件；不提供 COM、原生 DLL、外部系統命令與平行 Actor；繪圖以網頁重現電路圖、電壓剖面與曲線圖，不是 DSSView；Distribute、Refine_BusLevels、Tear_Circuit、Export Sections 暫不支援。範例參數僅供練習。')}</p><a href="https://opendss.epri.com/TheUserInterface.html" target="_blank" rel="noreferrer">{t('OpenDSS 原版介面說明 ↗')}</a></dialog>
  </main>;
}
