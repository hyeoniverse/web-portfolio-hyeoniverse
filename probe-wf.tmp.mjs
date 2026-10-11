import { chromium } from "playwright"; import fs from "fs";
const [S, tag] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const out = [];
for (const [w, h] of [[1280, 650], [1440, 900], [800, 600], [390, 844]]) {
  const p = await b.newPage({ viewport: { width: w, height: h }, reducedMotion: "reduce" });
  await p.goto("http://localhost:3148/works", { waitUntil: "networkidle", timeout: 200000 }).catch(() => {}); await p.waitForTimeout(2500);
  const r = await p.evaluate(() => [...document.querySelectorAll("[class*='WorksFlowCard'], [class*='WorksFlowCard'] *")].map(e => { const c = getComputedStyle(e); const b = e.getBoundingClientRect();
    const cls = typeof e.className === "string" ? e.className.split(" ").filter(Boolean).map(x => x.split("__").pop()).join(".") : e.tagName;
    return [cls, c.display, c.position, c.flexDirection, c.gap, c.margin, c.padding, c.top, c.left, c.transform, c.writingMode, c.opacity, c.zIndex, c.alignSelf, c.fontSize, Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)].join("|"); }));
  out.push("### " + w + "x" + h + " n=" + r.length, ...r);
  await p.close();
}
fs.writeFileSync(`${S}/wf-${tag}.txt`, out.join("\n")); console.log(out.filter(l=>l.startsWith("###")).join("\n")); await b.close();
