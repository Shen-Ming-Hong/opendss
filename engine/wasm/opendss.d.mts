export type DSSModule = {
  FS: {
    mkdir(path: string, mode?: number): void;
    mkdirTree(path: string): void;
    chdir(path: string): void;
    chmod(path: string, mode: number): void;
    writeFile(path: string, content: string): void;
    readFile(path: string, options: { encoding: "utf8" }): string;
    readdir(path: string): string[];
    stat(path: string): { mode: number; size: number };
    isDir(mode: number): boolean;
    unlink(path: string): void;
    rmdir(path: string): void;
  };
  ccall(name: string, result: string | null, types: string[], args: (string | number)[]): string;
};
export default function createDSS(options: {
  noInitialRun: boolean;
  print(value: string): void;
  printErr(value: string): void;
  instantiateWasm(imports: WebAssembly.Imports, receive: (instance: WebAssembly.Instance) => void): WebAssembly.Exports;
}): Promise<DSSModule>;
