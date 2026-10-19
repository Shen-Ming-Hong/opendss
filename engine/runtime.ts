import compiledModule from "./wasm/OpenDSSWasm.wasm";
import createDSS, { type DSSModule } from "./wasm/opendss.mjs";
import { z } from "zod";
import type { Result } from "../lib/model";

const schema = z.object({
  files: z.array(z.object({
    name: z.string().min(1).max(240).refine(name => !name.startsWith("/") && !/[\\:\x00\n\r\"]/.test(name) && name.split("/").every(part => part && part !== "." && part !== "..") && /\.(dss|csv|txt|dat)$/i.test(name), "請使用安全的相對檔案路徑。"),
    content: z.string(),
  })).min(1).max(100),
  entry: z.string().min(1),
  commands: z.string().max(16000).default(""),
  action: z.enum(["compile", "solve"]).default("solve"),
  analysis: z.enum(["snapshot", "faultstudy", "script"]).default("snapshot"),
});

export async function ready() {
  return createDSS({
    noInitialRun: true, print: () => {}, printErr: () => {},
    instantiateWasm(imports, receive) {
      // Dump、FileEdit 等指令寫完檔案後會呼叫 system() 開編輯器；回報成功，檔案照常回傳。
      (imports.env as Record<string, unknown>)._emscripten_system = () => 0;
      const instance = new WebAssembly.Instance(compiledModule, imports);
      receive(instance);
      return instance.exports;
    },
  }).then(module => {
    module.FS.mkdir("/work", 0o777);
    function protect(path: string) {
      if (path === "/work") return;
      if (path === "/proc") { module.FS.chmod(path, 0o555); return; }
      const directory = module.FS.isDir(module.FS.stat(path).mode);
      if (directory) for (const name of module.FS.readdir(path)) if (name !== "." && name !== "..") protect((path === "/" ? "" : path) + "/" + name);
      if (directory || !path.startsWith("/dev/")) module.FS.chmod(path, directory ? 0o555 : 0o444);
    }
    protect("/");
    return module;
  });
}

export async function runModel(input: unknown): Promise<Result> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) throw new Error("模型資料格式錯誤：" + parsed.error.issues[0].message);
  const payload = parsed.data;
  if (!payload.files.some(file => file.name === payload.entry && /\.dss$/i.test(file.name))) throw new Error("請選擇已上傳的 .dss 主檔。 ");
  if (new Set(payload.files.map(file => file.name.toLowerCase())).size !== payload.files.length) throw new Error("檔名重複，請先重新命名。 ");
  if (payload.files.reduce((size, file) => size + new TextEncoder().encode(file.content).length, 0) > 2 * 1024 * 1024) throw new Error("模型內容總大小不可超過 2 MB。");
  for (const script of [...payload.files.filter(file => /\.dss$/i.test(file.name)).map(file => file.content), payload.commands]) {
    if (/^\s*(?:distribute|refine_buslevels|tear_circuit|export\s+sections)\b/im.test(script)) throw new Error("網頁移植版暫不支援 Distribute、Refine_BusLevels、Tear_Circuit 與 Export Sections。 ");
    if (/^\s*(?:newactor|clone|doscmd|connect|disconnect)\b/im.test(script) || /^\s*set\s+[^\n]*(?:parallel|adiakoptics|actor)\s*=/im.test(script)) throw new Error("網頁移植版不支援平行 Actor、外部系統命令與外部連線。 ");
  }
  const module = await ready();
  const started = performance.now();
  // Each request gets fresh native globals; Clear alone leaves upstream error/settings state.
  try {
    for (const file of payload.files) {
      const path = "/work/" + file.name;
      module.FS.mkdirTree(path.slice(0, path.lastIndexOf("/")));
      module.FS.writeFile(path, file.content);
    }
    // 「依腳本」模式不強制最後再 Solve：沿用 compileOnly 路徑，但仍執行額外指令。
    const script = payload.analysis === "script";
    let output: string;
    try { output = module.ccall("DSS_Run", "string", ["string", "string", "number", "number"], ["/work/" + payload.entry, payload.action === "compile" ? "" : payload.commands, payload.analysis === "faultstudy" ? 1 : 0, payload.action === "compile" || script ? 1 : 0]); }
    catch { throw new Error("引擎執行指令時發生內部錯誤，這個指令可能不適用於網頁移植版或目前的模型。"); }
    const result = JSON.parse(output);
    if (result.error) throw new Error(result.error);
    const reports: { name: string; content: string }[] = [];
    const originals = new Set(payload.files.map(file => ("/work/" + file.name).toLowerCase()));
    let reportBytes = 0;
    function collect(path: string) {
      const stat = module.FS.stat(path);
      if (module.FS.isDir(stat.mode)) {
        for (const name of module.FS.readdir(path)) if (name !== "." && name !== "..") collect(path + "/" + name);
      } else if (!originals.has(path.toLowerCase()) && /\.(csv|txt|dss|dsv)$/i.test(path) && stat.size + reportBytes <= 500000 && reports.length < 20) {
        reports.push({ name: path.slice(6), content: module.FS.readFile(path, { encoding: "utf8" }) });
        reportBytes += stat.size;
      }
    }
    collect("/work");
    return { ...result, reports, elapsedMS: Math.round(performance.now() - started), isolated: true };
  } finally {
    try {
      module.ccall("DSS_Clear", null, [], []);
      module.FS.chdir("/");
      function remove(path: string) {
        if (module.FS.isDir(module.FS.stat(path).mode)) {
          for (const name of module.FS.readdir(path)) if (name !== "." && name !== "..") remove(path + "/" + name);
          if (path !== "/work") module.FS.rmdir(path);
        } else module.FS.unlink(path);
      }
      remove("/work");
    } catch { /* This instance is discarded after the request. */ }
  }
}
