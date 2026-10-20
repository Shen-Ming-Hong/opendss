// 介面語言。字典以繁體中文原文為鍵；查不到時回傳原文，所以伺服器與引擎的訊息也能直接丟進 translate()。
// OpenDSS 指令、元件名稱與報表內容一律維持英文，不翻譯。
import zhCN from './locales/zh-CN';
import ja from './locales/ja';
import ko from './locales/ko';
import es from './locales/es';
import ptBR from './locales/pt-BR';

export type Lang = 'zh-TW' | 'zh-CN' | 'en' | 'ja' | 'ko' | 'es' | 'pt-BR';
export const languages: { code: Lang; name: string; word: string }[] = [
  { code: 'zh-TW', name: '繁體中文', word: '語言' }, { code: 'zh-CN', name: '简体中文', word: '语言' }, { code: 'en', name: 'English', word: 'Language' },
  { code: 'ja', name: '日本語', word: '言語' }, { code: 'ko', name: '한국어', word: '언어' }, { code: 'es', name: 'Español', word: 'Idioma' }, { code: 'pt-BR', name: 'Português (Brasil)', word: 'Idioma' },
];
// 上傳的檔案不是 UTF-8 時，依介面語言猜舊編碼（各地區 Windows 常見的預設編碼）。
export const legacyEncoding: Record<Lang, string> = { 'zh-TW': 'big5', 'zh-CN': 'gbk', en: 'windows-1252', ja: 'shift_jis', ko: 'euc-kr', es: 'windows-1252', 'pt-BR': 'windows-1252' };
// 中日文用全形標點。
export const fullWidth = (lang: Lang) => lang === 'zh-TW' || lang === 'zh-CN' || lang === 'ja';

// 依瀏覽器語言挑介面語言；沒有對應的語言時用英文。
export function detectLang(preferred: readonly string[]): Lang {
  for (const tag of preferred) {
    const code = tag.toLowerCase();
    if (/^zh-(tw|hk|mo)|^zh-hant/.test(code)) return 'zh-TW';
    if (/^zh/.test(code)) return 'zh-CN';
    const base = code.split('-')[0];
    if (base === 'en') return 'en';
    if (base === 'ja' || base === 'ko' || base === 'es') return base;
    if (base === 'pt') return 'pt-BR';
  }
  return 'en';
}

export const english: Record<string, string> = {
  // 功能表
  '檔案': 'File', '編輯': 'Edit', '執行': 'Do', '設定': 'Set', '建立': 'Make', '匯出': 'Export', '顯示': 'Show', '視覺化': 'Visualize', '繪圖': 'Plot', '重設': 'Reset', '視窗': 'Window', '說明': 'Help',
  '新增模型': 'New model', '開啟檔案…': 'Open files…', '開啟模型資料夾…': 'Open model folder…', '下載目前檔案': 'Download current file', '下載完整專案': 'Download full project', '儲存電路（Save Circuit）': 'Save Circuit',
  '選取全部': 'Select all', '放大字體': 'Larger font', '縮小字體': 'Smaller font',
  '編譯主檔（Compile）': 'Compile', '求解（Solve）': 'Solve', '選取內容加入指令視窗': 'Send selection to command window',
  '穩態潮流（Snapshot）': 'Snapshot power flow', '故障分析（FaultStudy）': 'Fault study', '依腳本設定（不另外求解）': 'As set by script (no extra Solve)', '加入：': 'Add: ',
  '日負載（Daily）': 'Daily', '年負載（Yearly）': 'Yearly', '工作週期（DutyCycle）': 'DutyCycle', '諧波（Harmonics）': 'Harmonics', '動態（Dynamics）': 'Dynamics', '直接解（Direct）': 'Direct', '蒙地卡羅（MonteCarlo1）': 'MonteCarlo1', '尖峰日（PeakDay）': 'PeakDay',
  '新增空白模型': 'New blank model', '載入配電範例': 'Load distribution example',
  '匯流排電壓 CSV': 'Bus voltages CSV', '完整計算結果 JSON': 'Full results JSON',
  '目前元件的電流與功率': 'Current and power of selected element',
  '匯流排電壓圖': 'Bus voltage plot', '電路圖（Plot Circuit）': 'Plot Circuit', '電壓剖面（Plot Profile）': 'Plot Profile', '曲線圖（Plot Monitor）': 'Plot Monitor',
  '清除計算結果': 'Clear results', '已清除計算結果。': 'Results cleared.', '清除執行紀錄': 'Clear log',
  '隱藏主要指令視窗': 'Hide main command window', '顯示主要指令視窗': 'Show main command window', '隱藏結果視窗': 'Hide results', '顯示結果視窗': 'Show results',
  '使用說明與指令對照': 'Guide and command reference', 'OpenDSS 官方文件 ↗': 'OpenDSS documentation ↗',
  // Show／Export 報表
  '節點電壓': 'Node voltages', '元件電流': 'Element Currents', '元件功率': 'Element powers', '損失': 'Losses', '故障電流': 'Fault Currents', '變壓器分接頭': 'Transformer taps', '過載元件': 'Overloads', '未供電負載': 'Unserved loads', '電度表': 'Meters', '發電機': 'Generators', '收斂情形': 'Convergence', '孤立匯流排': 'Isolated buses', '元件清單': 'Element list', '匯流排清單': 'Bus list', '功率不平衡': 'Power mismatch', '電壓基準不符': 'kV base mismatch', '狀態變數': 'State variables', '元件 Y 矩陣': 'Element Y matrices', '事件紀錄': 'Event log', '保護區域': 'Zones', '額定值': 'Ratings', '迴路': 'Loops',
  '匯流排電壓': 'Bus Voltages', '序電壓': 'Sequence voltages', '序電流': 'Sequence currents', '元件損失': 'Element losses', '電路摘要': 'Summary', '負載': 'Loads', '饋線容量': 'Feeder capacity', '分接頭': 'Taps', '電壓剖面': 'Voltage Profile', '匯流排座標': 'Bus coordinates', '節點名稱': 'Node names', '系統 Y 矩陣': 'System Y matrix', '元件數量': 'Element counts', '文字報表': 'Reports', '電路圖': 'Circuit', '曲線圖': 'Curves',
  // 標題、工具列、選擇列
  '雲端工作台': 'Cloud Workbench', '免登入使用': 'No sign-in required', '使用說明': 'Help', '主要功能表': 'Main menu', '熟悉的指令，熟悉的工作流程': 'Familiar commands, familiar workflow', '常用工具': 'Toolbar',
  '開啟檔案': 'Open files', '下載目前檔案（⌘/Ctrl+S）': 'Download current file (⌘/Ctrl+S)', 'Compile：載入並執行主檔': 'Compile: load and run the main script', '編譯': 'Compile', '執行中': 'Running', '求解': 'Solve', '摘要': 'Summary',
  '切換主要指令視窗': 'Toggle main command window', '指令視窗': 'Commands', '雲端已連線': 'Cloud connected', '正在檢查雲端引擎': 'Checking cloud engine', '雲端引擎已連線': 'Cloud engine connected', '引擎暫時無法連線': 'Engine unavailable',
  '元件類型': 'Element Type', '全部元件': 'All elements', '電壓源': 'Voltage source', '變壓器': 'Transformer', '線路': 'Line', '太陽光電': 'PV system', '選取電路元件': 'Select circuit element', '選取元件…': 'Select element…', '請先編譯模型': 'Compile the model first', '顯示元件資訊': 'Show element info',
  '求解模式': 'Solution Mode', '穩態潮流 · Snapshot': 'Snapshot power flow', '故障分析 · FaultStudy': 'Fault study · FaultStudy', '依腳本設定 · Set Mode': 'As set by script · Set Mode',
  '主腳本': 'Main script', '編譯主腳本': 'Compile main script', '草稿暫存於此裝置': 'Draft saved on this device', '{0} 個檔案': '{0} files',
  // 結果列與狀態列
  '結果': 'Result', '雲端引擎正在執行模型…': 'Cloud engine is running the model…', '模型已變更，請重新求解': 'Model changed, solve again', '計算收斂': 'Converged', '計算尚未收斂': 'Not converged', '{0} 個匯流排 · {1} 個元件': '{0} buses · {1} elements',
  '尚未編譯模型。開啟 .dss 主檔，或直接編譯目前範例。': 'No model compiled yet. Open a .dss main script, or compile the current example.',
  '雲端計算中…': 'Computing in the cloud…', '就緒': 'Ready', '電路：': 'Circuit: ', '尚無作用中電路': 'No active circuit', '雲端運算': 'Cloud computing',
  // 編輯器與指令視窗
  '模型腳本編輯器': 'Model script editor', '模型腳本': 'Model script', '放大編輯區': 'Maximize editor', '已開啟檔案': 'Open files', 'DSS 模型內容': 'DSS model content', 'DSS 腳本 · UTF-8': 'DSS script · UTF-8', '第 {0} 行，第 {1} 欄': 'Ln {0}, Col {1}',
  '主要指令視窗': 'Main command window', '隱藏指令視窗': 'Hide command window', '額外指令': 'Extra commands', '額外 DSS 指令': 'Extra DSS commands', '額外指令可輸入於此，再按「執行指令」。例如：Edit Load.671 kW=1000': 'Type extra commands here, then press "Run commands". Example: Edit Load.671 kW=1000',
  '套用於目前主腳本': 'Applied to the main script', '執行指令': 'Run commands', '執行紀錄': 'Log', '清除': 'Clear', '已準備就緒': 'Ready', '編譯模型後，執行紀錄會顯示於此。': 'The log appears here after you compile a model.',
  '輸入單行 DSS 指令': 'Enter a single DSS command', '輸入指令，例如 Summary': 'Enter a command, e.g. Summary', '送出指令': 'Send command',
  // 結果分頁
  '計算結果': 'Results', '結果分類': 'Result views', '作用中電路': 'Active Circuit', '電源供電': 'Source Power', '總有功損失': 'Total Losses', '% 佔電源供電': '% of source power', '相電壓範圍（節點 1–3）': 'Phase voltage range (nodes 1–3)', '{0} 匯流排 · {1} 次迭代': '{0} buses · {1} iterations',
  '各匯流排三相短路電流': 'Three-phase fault current at each bus', '相對中性點電壓 · BasekV 為相電壓': 'Line-to-neutral voltages · BasekV is phase voltage', '搜尋匯流排': 'Search buses', '搜尋匯流排…': 'Search buses…',
  '請將求解模式設為「故障分析」，再按「求解」。': 'Set the solution mode to "Fault study", then press "Solve".', '匯流排 Bus': 'Bus', 'BasekV（L-N）': 'BasekV (L-N)', '節點 {0}': 'Node {0}',
  '第一端電流與流入元件的功率 · 負值表示流出': 'Terminal 1 currents and power into the element · negative means flowing out', '顯示全部元件': 'Show all elements', '元件 Element': 'Element', '損失 (kW)': 'Losses (kW)',
  '繪圖類型': 'Plot type', '匯流排節點電壓': 'Bus node voltages', '相 1': 'Phase 1', '相 2': 'Phase 2', '相 3': 'Phase 3', '相': 'Phase', '依模型匯流排順序排列 · p.u.': 'In model bus order · p.u.', '各匯流排三相電壓折線圖': 'Three-phase voltage at each bus',
  '下載': 'Download', '可輸入 Solve，換行後輸入 Show Voltages LN Nodes，再執行指令以產生報表。': 'Use the Show or Export menu, or type Solve and then Show Voltages LN Nodes on the next line and run the commands.',
  '從一個電路，開始分析': 'Start from a circuit', '開啟你的 .dss 模型，或按「編譯」執行範例。計算結果會顯示在這裡。': 'Open your .dss model, or press "Compile" to run the example. Results appear here.', '編譯目前模型': 'Compile current model',
  // 繪圖
  '模型沒有匯流排座標。請在主檔加入 Buscoords 檔案（例如 Buscoords BusCoords.dat）後重新求解。': 'The model has no bus coordinates. Add a Buscoords file to the main script (e.g. Buscoords BusCoords.dat) and solve again.',
  '顏色：故障電流，藍色低、紅色高': 'Color: fault current, blue low, red high', '線寬：第一端電流 · 虛線：變壓器': 'Width: terminal 1 current · dashed: transformer',
  '沒有電壓剖面資料。請在饋線起點加入 EnergyMeter（例如 New EnergyMeter.Feeder Element=Line.L1 Terminal=1），並用穩態潮流或依腳本模式求解。': 'No profile data. Add an EnergyMeter at the head of the feeder (e.g. New EnergyMeter.Feeder Element=Line.L1 Terminal=1) and solve in Snapshot or script mode.',
  '橫軸：與電度表距離（km）· 縱軸：p.u.': 'X: distance from meter (km) · Y: p.u.',
  '沒有可繪製的 CSV。請先加入 Monitor、執行 Daily 等模式求解，再用「匯出 → Export Monitors」或其他 Export 產生 CSV。': 'No CSV to plot. Add a Monitor, solve in a mode such as Daily, then create a CSV with Export Monitors or another Export.',
  '選擇 CSV 報表': 'Choose CSV report', '橫軸': 'X axis',
  // 說明
  '關閉說明': 'Close help', '熟悉的 OpenDSS，現在在瀏覽器。': 'The OpenDSS you know, now in your browser.',
  '此工作台保留原版功能表、工具列、模型腳本與主要指令視窗。計算由雲端的 OpenDSS-C WASM 引擎執行，不需要在自己的電腦上安裝任何程式。': 'This workbench keeps the original menus, toolbar, model script and main command window. Calculations run on the OpenDSS-C WASM engine in the cloud, so there is nothing to install on your computer.',
  '開啟模型': 'Open a model', '：選擇 .dss 主檔與其引用檔案，或開啟整個模型資料夾。': ': choose the .dss main script and the files it references, or open a whole model folder.',
  '編譯 Compile': 'Compile', '：載入主檔，依序執行檔案內的指令。': ': loads the main script and runs its commands in order.',
  '求解 Solve': 'Solve', '：套用額外指令，執行所選模式的潮流或故障分析。選「依腳本設定」時不另外求解，Daily、Harmonics 等模式請用「設定」功能表加入 Set Mode 與 Solve。': ': applies the extra commands and runs a power flow or fault study in the selected mode. "As set by script" adds no extra Solve; for Daily, Harmonics and other modes, add Set Mode and Solve from the Set menu.',
  '查看與匯出': 'View and export', '：使用結果分頁，或從「顯示」「匯出」功能表直接產生官方 Show／Export 報表，「檔案 → 儲存電路」可取回 Save Circuit 的 .dss；完整專案可下載後在另一裝置開啟。每次操作都重新載入主腳本；產生報表前請先執行 Solve。': ': use the result tabs, or create the official Show/Export reports from the Show and Export menus. File → Save Circuit returns the saved .dss files. Download the full project to open it on another device. Every run reloads the main script; reports are produced after a Solve.',
  '草稿只暫存於目前瀏覽器，各裝置不會自動同步。檔案只在按下編譯／求解後送至雲端計算，不作永久儲存。模型引用路徑須使用相對路徑。': 'Drafts are kept only in this browser and do not sync between devices. Files are sent to the cloud only when you compile or solve, and are not stored. Model references must use relative paths.',
  '這是移植預覽版，已以基礎潮流、故障分析與 IEEE 123 節點案例核對。尚未驗證所有元件與模擬模式。單次上限為 2 MB 模型、100 個檔案、2,000 個匯流排、5,000 個元件；不提供 COM、原生 DLL、外部系統命令與平行 Actor；繪圖以網頁重現電路圖、電壓剖面與曲線圖，不是 DSSView；Distribute、Refine_BusLevels、Tear_Circuit、Export Sections 暫不支援。範例參數僅供練習。': 'This is a preview port, checked against basic power flow, fault study and the IEEE 123 node test case. Not every element and simulation mode has been verified. Limits per run: 2 MB model, 100 files, 2,000 buses, 5,000 elements. COM, native DLLs, external system commands and parallel actors are not available. Plots are web versions of the circuit, profile and monitor plots, not DSSView. Distribute, Refine_BusLevels, Tear_Circuit and Export Sections are not supported yet. Example parameters are for practice only.',
  'OpenDSS 原版介面說明 ↗': 'OpenDSS user interface guide ↗',
  // 執行紀錄與確認
  '瀏覽器儲存空間不足，請下載模型保留修改。': 'Browser storage is full. Download the model to keep your changes.', '正在編譯 {0}…': 'Compiling {0}…', '正在執行{0}…': 'Running {0}…', '故障分析': 'fault study', '腳本指令': 'script commands', '穩態潮流': 'snapshot power flow',
  '編譯完成': 'Compiled', '計算完成': 'Solved', '｜': ' | ', '已收斂': 'converged', '尚未收斂': 'not converged', '執行失敗，請重試。': 'Run failed, please try again.', '計算失敗，請檢查模型。': 'Calculation failed, check the model.',
  '專案檔格式錯誤。': 'Invalid project file.', '開啟專案會取代此裝置的草稿。請先下載需要保留的模型。確定開啟？': 'Opening a project replaces the draft on this device. Download anything you want to keep first. Open it?', '已開啟專案。': 'Project opened.', "依序執行 {0}/{1}：{2}…": "Batch run {0}/{1}: {2}…", "依序執行完成，共 {0} 支。": "Batch run finished: {0} scripts.", "依序執行 {0} 支主腳本": "Run {0} main scripts in order", "依序執行 {0} 支": "Run {0} in order", "依序執行比較": "Batch comparison", "電路": "Circuit", "模式": "Mode", "收斂": "Converged", "故障電流（{0}）": "Fault currents ({0})", "電壓變動率": "Voltage change", "需要兩支以上的潮流腳本才能比較電壓。": "At least two power-flow scripts are needed to compare voltages.", "比較前": "Before", "比較後": "After", "匯出比較 CSV": "Export comparison CSV", "最大電壓變動率 {0}%，在 {1}": "Maximum voltage change {0}% at {1}", "變動率 = (後 − 前) ÷ 前 × 100%": "Change = (after − before) ÷ before × 100%", "最大變動率 %": "Max change %", '還原版面': "Restore layout", '放大結果視窗': "Maximize results", '拖曳調整結果視窗高度': "Drag to resize the results panel", '確認': "Confirm", '確定': "OK", '取消': "Cancel", '{0} 傳來 {1} 個檔案，主腳本：{2}。開啟會取代此裝置的草稿，請先下載需要保留的模型。確定開啟？': "{0} sent {1} files (main script: {2}). Opening them replaces the draft on this device. Download anything you want to keep first. Open them?",
  '上限為 100 個檔案、合計 2 MB。': 'The limit is 100 files and 2 MB in total.', '至少需要一個 .dss 模型檔案。': 'At least one .dss model file is required.', '開啟新模型會取代此裝置的草稿。請先下載需要保留的檔案。確定開啟？': 'Opening a new model replaces the draft on this device. Download anything you want to keep first. Open it?',
  '已開啟 {0} 個檔案，主檔：{1}': 'Opened {0} files, main script: {1}', '讀取檔案失敗。': 'Could not read the files.', '已匯出匯流排電壓 CSV。': 'Bus voltages CSV exported.',
  '建立新模型會取代此裝置的草稿，確定繼續？': 'A new model replaces the draft on this device. Continue?', '已建立新模型。': 'New model created.', '載入範例會取代此裝置的草稿，確定繼續？': 'Loading the example replaces the draft on this device. Continue?', '已載入 IEEE 13 節點測試饋線範例。': 'IEEE 13 Node Test Feeder example loaded.',
  '已將選取內容加入主要指令視窗，請確認後執行。': 'Selection added to the main command window. Check it, then run.', '已將 {0} 加入主要指令視窗，請按「執行指令」。': 'Added {0} to the main command window. Press "Run commands".',
  // 伺服器與引擎訊息
  '雲端引擎暫時無法載入，請稍後重試。': 'The cloud engine could not load. Please try again later.', '請從本站送出計算。': 'Please submit calculations from this site.', '請提供模型內容。': 'Please provide the model.', '上傳資料不可超過 4 MB。': 'Uploads cannot exceed 4 MB.', '引擎執行失敗，請檢查模型。': 'The engine failed, check the model.',
  '請選擇已上傳的 .dss 主檔。': 'Choose an uploaded .dss main script.', '檔名重複，請先重新命名。': 'Duplicate file names, rename them first.', '模型內容總大小不可超過 2 MB。': 'The model cannot exceed 2 MB in total.', '請使用安全的相對檔案路徑。': 'Use safe relative file paths.',
  '網頁移植版暫不支援 Distribute、Refine_BusLevels、Tear_Circuit 與 Export Sections。': 'The web port does not support Distribute, Refine_BusLevels, Tear_Circuit or Export Sections yet.',
  '網頁移植版不支援平行 Actor、外部系統命令與外部連線。': 'The web port does not support parallel actors, external system commands or external connections.',
  '引擎執行指令時發生內部錯誤，這個指令可能不適用於網頁移植版或目前的模型。': 'The engine hit an internal error. This command may not work in the web port or with this model.',
};
export const dictionaries: Partial<Record<Lang, Record<string, string>>> = { en: english, 'zh-CN': zhCN, ja, ko, es, 'pt-BR': ptBR };
const prefixes: Partial<Record<Lang, string>> = { en: 'Invalid model data: ', 'zh-CN': '模型数据格式错误：', ja: 'モデルデータの形式エラー：', ko: '모델 데이터 형식 오류: ', es: 'Datos de modelo no válidos: ', 'pt-BR': 'Dados de modelo inválidos: ' };
const prefix = '模型資料格式錯誤：';

export function translate(lang: Lang, text: string, ...args: (string | number)[]) {
  let out = text;
  const dictionary = dictionaries[lang];
  if (dictionary) {
    const key = text.trim();
    out = dictionary[key] ?? (key.startsWith(prefix) ? prefixes[lang] + (dictionary[key.slice(prefix.length)] ?? key.slice(prefix.length)) : text);
  }
  const filled = args.reduce<string>((value, arg, i) => value.replaceAll('{' + i + '}', String(arg)), out);
  return lang === 'en' ? filled.replace(/\b1 (file|buse|element|iteration)s\b/g, (_, word: string) => '1 ' + (word === 'buse' ? 'bus' : word)) : filled;
}
