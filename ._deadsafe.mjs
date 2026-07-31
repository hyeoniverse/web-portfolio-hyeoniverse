import { readFileSync, writeFileSync } from "fs"; import { execSync } from "child_process"; import postcss from "postcss";
const APPLY=process.argv[2]==="apply";
const cssFiles=execSync("find src -name '*.module.css'",{encoding:"utf8"}).trim().split("\n");
const codeFiles=execSync("find src -name '*.tsx' -o -name '*.ts'",{encoding:"utf8"}).trim().split("\n");
const codeBlob=codeFiles.map(f=>readFileSync(f,"utf8")).join("\n");
// composes 참조
const composed=new Set();
for(const f of cssFiles){ try{ postcss.parse(readFileSync(f,"utf8")).walkDecls("composes",d=>d.value.split(/\s+/).forEach(x=>composed.add(x.replace(/^\./,"")))); }catch{} }
// 동적 템플릿 패턴: X[`prefix${...}suffix`] → prefix/suffix 추출 (여러 ${} 도)
const dyn=[]; for(const m of codeBlob.matchAll(/[\w]+\[\s*`([^`]*?)`\s*\]/g)){ const lit=m[1]; if(!lit.includes("${"))continue; const parts=lit.split(/\$\{[^}]*\}/); dyn.push(parts); }
const dynReach=c=>dyn.some(parts=>{ // parts=[prefix,...,suffix], 클래스가 prefix 시작 && suffix 끝 && 중간 조각 포함
  const pre=parts[0], suf=parts[parts.length-1];
  if(!c.startsWith(pre)||!c.endsWith(suf))return false;
  return c.length>=pre.length+suf.length;
});
let total=0; const perFile=[]; const excluded=[];
for(const f of cssFiles){
  let root; try{root=postcss.parse(readFileSync(f,"utf8"));}catch{continue;}
  const allSel=[]; root.walkRules(r=>allSel.push(r.selector));
  const classes=new Set(); root.walkRules(r=>{ if(/:global/.test(r.selector))return; const m=r.selector.match(/\.([\w-]+)/g); if(m)m.forEach(x=>classes.add(x.slice(1))); });
  const dead=[];
  for(const c of classes){
    if(composed.has(c))continue;
    if(new RegExp("[\\.\\[\"'`]"+c.replace(/-/g,"\\-")+"(?![\\w-])").test(codeBlob))continue;
    if(new RegExp("\\."+c.replace(/-/g,"\\-")+"(?![\\w-])").test(allSel.join("\n"))&&allSel.filter(s=>new RegExp("\\."+c.replace(/-/g,"\\-")+"(?![\\w-])").test(s)).length>1)continue;
    if(dynReach(c)){ excluded.push(c); continue; } // 동적 생성 가능 → 제외
    dead.push(c);
  }
  if(dead.length){ total+=dead.length; perFile.push([f,dead]); }
}
console.log(`동적 제외된 클래스: ${excluded.length} (예: ${excluded.slice(0,10).join(", ")})`);
console.log(`\n진짜 안전한 dead: ${total}개 / ${perFile.length}파일`);
perFile.map(([f,d])=>[f.replace("src/",""),d]).sort((a,b)=>b[1].length-a[1].length).slice(0,20).forEach(([f,d])=>console.log(`  ${String(d.length).padStart(3)}  ${f}  [${d.slice(0,5).join(",")}${d.length>5?"...":""}]`));
if(APPLY){ let removed=0; for(const [f,dead] of perFile){ const ds=new Set(dead); const root=postcss.parse(readFileSync(f,"utf8")); root.walkRules(r=>{const cs=[...new Set((r.selector.match(/\.([\w-]+)/g)||[]).map(x=>x.slice(1)))]; if(cs.length&&cs.every(x=>ds.has(x))){r.remove();removed++;}}); root.walkAtRules(/media|container|supports/,at=>{if(at.nodes.length===0)at.remove();}); writeFileSync(f,root.toString()); } console.log(`\n✓ ${removed} 규칙 제거`); }
