// 檢查介面字典：程式裡每個 t()／term() 的繁中原文，在每種語言的字典都要有翻譯，佔位符 {0} {1} 也要一致。
// 用法：npx tsx scripts/check-i18n.ts
import { readFileSync } from "node:fs";
import { dictionaries, english, languages } from "../lib/i18n";

const keys = new Set<string>();
for (const file of ["app/workbench.tsx", "app/plots.tsx"]) for (const match of readFileSync(file, "utf8").matchAll(/\b(?:t|term)\('((?:[^'\\]|\\.)*)'/g)) if (/[　-鿿＀-￯]/.test(match[1])) keys.add(match[1]);
for (const key of Object.keys(english)) keys.add(key);
const problems: string[] = [];
for (const { code } of languages.filter(item => item.code !== "zh-TW")) for (const key of keys) {
  const value = dictionaries[code]?.[key];
  if (value === undefined) problems.push(`${code} 缺少：${key}`);
  else if ((key.match(/\{\d\}/g) ?? []).sort().join() !== (value.match(/\{\d\}/g) ?? []).sort().join()) problems.push(`${code} 佔位符不符：${key}`);
}
if (problems.length) { console.error("FAIL\n" + problems.join("\n")); process.exit(1); }
console.log(`PASS: ${keys.size} 個字串 × ${languages.length - 1} 種語言`);
