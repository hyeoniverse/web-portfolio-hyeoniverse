import { readFileSync, writeFileSync } from "fs"; import { execSync } from "child_process"; import postcss from "postcss";
const APPLY=process.argv[2]==="apply";
const ALIAS="(?:styles|shared|local|s|cls|css|st)";
const cssFiles=execSync("find src -name '*.module.css'",{encoding:"utf8"}).trim().split("\n");
const codeFiles=execSync("find src -name '*.tsx' -o -name '*.ts'",{encoding:"utf8"}).trim().split("\n");
const codeBlob=codeFiles.map(f=>readFileSync(f,"utf8")).join("\n");
const composed=new Set();
for(const f of cssFiles){ try{ postcss.parse(readFileSync(f,"utf8")).walkDecls("composes",d=>d.value.split(/\s+/).forEach(x=>composed.add(x.replace(/^\./,"")))); }catch{} }
// 동적 템플릿: styles[`...${}...`]
const tmpl=[]; for(const m of codeBlob.matchAll(new RegExp(ALIAS+"\\[\\s*`([^`]*)`","g"))){ const lit=m[1]; if(!lit.includes("${"))continue; const parts=lit.split(/\$\{[^}]*\}/); tmpl.push({pre:parts[0],suf:parts[parts.length-1]}); }
// 순수 변수 접근 존재? styles[identifier] (문자열/템플릿 아님)
const pureVar=new RegExp(ALIAS+"\\[\\s*[A-Za-z_$][\\w$.?\\[\\]'\"]*\\s*\\]").test(codeBlob);
const dynReach=c=>tmpl.some(({pre,suf})=>(pre||suf)&&c.startsWith(pre)&&c.endsWith(suf)&&c.length>=pre.length+suf.length);
console.log(`동적 템플릿 ${tmpl.length}개 (예 prefix: ${[...new Set(tmpl.map(t=>t.pre).filter(Boolean))].slice(0,8).join(", ")})`);
console.log(`순수변수 styles[x] 접근 존재: ${pureVar} ${pureVar?"→ 보수적으로 순수변수와 같은 파일들은 스킵 안 하고, 템플릿 제외 + 빌드/시각회귀로 검증":""}`);
let total=0; const perFile=[];
for(const f of cssFiles){
  let root; try{root=postcss.parse(readFileSync(f,"utf8"));}catch{continue;}
  const allSel=[]; root.walkRules(r=>allSel.push(r.selector));
  const classes=new Set(); root.walkRules(r=>{ if(/:global/.test(r.selector))return; const m=r.selector.match(/\.([\w-]+)/g); if(m)m.forEach(x=>classes.add(x.slice(1))); });
  const dead=[];
  for(const c of classes){
    if(composed.has(c))continue;
    if(new RegExp("[\\.\\[\"'`]"+c.replace(/-/g,"\\-")+"(?![\\w-])").test(codeBlob))continue;
    const reSel=new RegExp("\\."+c.replace(/-/g,"\\-")+"(?![\\w-])");
    if(allSel.filter(s=>reSel.test(s)).length>1)continue;
    if(dynReach(c))continue;
    dead.push(c);
  }
  if(dead.length){ total+=dead.length; perFile.push([f,dead]); }
}
console.log(`\n템플릿 제외 후 dead: ${total}개 / ${perFile.length}파일`);
perFile.map(([f,d])=>[f.replace("src/",""),d]).sort((a,b)=>b[1].length-a[1].length).slice(0,22).forEach(([f,d])=>console.log(`  ${String(d.length).padStart(3)}  ${f}  [${d.slice(0,4).join(",")}${d.length>4?"..":""}]`));
if(APPLY){let rm=0;for(const [f,dead] of perFile){const ds=new Set(dead);const root=postcss.parse(readFileSync(f,"utf8"));root.walkRules(r=>{const cs=[...new Set((r.selector.match(/\.([\w-]+)/g)||[]).map(x=>x.slice(1)))];if(cs.length&&cs.every(x=>ds.has(x))){r.remove();rm++;}});root.walkAtRules(/media|container|supports/,at=>{if(at.nodes.length===0)at.remove();});writeFileSync(f,root.toString());}console.log(`✓ ${rm}규칙 제거`);}
