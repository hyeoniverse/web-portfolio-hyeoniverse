import { chromium } from "playwright"; import fs from "fs";
const [S, tag] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const out = [];
for (const w of [1440, 600]) {
  const p = await b.newPage({ viewport: { width: w, height: 900 }, reducedMotion: "reduce" });
  for (const L of ["magazine", "grid", "list", "compact", "masonry", "featured", "timeline", "SERIES"]) {
    const url = L === "SERIES" ? "/zprobe?S=x" : "/zprobe?L=" + L;
    await p.goto("http://localhost:3148" + url, { waitUntil: "networkidle", timeout: 200000 }); await p.waitForTimeout(1500);
    const r = await p.evaluate(() => [...document.querySelectorAll("body *")].filter(e => !e.closest("nav,header")).map(e => { const c = getComputedStyle(e); const b = e.getBoundingClientRect();
      const cls = typeof e.className === "string" ? e.className.split(" ").filter(Boolean).map(x => x.split("__").pop()).sort().join(".") : e.tagName;
      return [cls, c.display, c.gridTemplateColumns, c.gap, c.aspectRatio, c.padding, c.borderBottom, c.fontSize, c.lineHeight, c.webkitLineClamp, Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)].join("|"); }));
    out.push("### " + w + " " + L, ...r);
  }
  await p.close();
}
fs.writeFileSync(`${S}/pg-${tag}.txt`, out.join("\n")); console.log(out.length); await b.close();
