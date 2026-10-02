/** docs/tokens.md 를 CSS 토큰에서 다시 만든다 — `npm run tokens:doc` */
import fs from "node:fs";
import path from "node:path";
import { buildTokenDoc } from "./lib/tokenDoc";

const root = path.resolve(__dirname, "..");
const out = path.join(root, "docs/tokens.md");
fs.writeFileSync(out, buildTokenDoc(root));
console.log(`wrote ${path.relative(root, out)}`);
