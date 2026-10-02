/** 스타일 이행 감시의 기준선을 지금 코드로 다시 만든다 — `npm run style:ratchet` (scripts/lib/styleRatchet.ts) */
import fs from "node:fs";
import path from "node:path";
import { BASELINE_PATH, METRICS, measure, total } from "./lib/styleRatchet";

const root = path.resolve(__dirname, "..");
const current = measure(root);
fs.writeFileSync(path.join(root, BASELINE_PATH), JSON.stringify(current, null, 2) + "\n");
for (const m of METRICS) console.log(`${String(total(current[m.id])).padStart(6)}  [${m.rule}] ${m.what}`);
console.log(`wrote ${BASELINE_PATH}`);
