"use client";

/* ── 서비스 호출 기록 (/admin/service-log) ──
   AI·이미지 검색·TTS, Resend 메일, GitHub API, 예약 작업, 문의 폼 첨부의 성공·실패(lib/serviceLog, service_logs)를
   새것부터 보인다. 위에는 공급자·작업마다의 성공·실패 수와 마지막 실패, 아래에는 기록 줄. 종류·공급자·결과로 거른다.
   위에 설정 › 서비스와 같은 "AI·외부 서비스 상태" 표(접을 수 있다), 그 아래 기록.
   설정 › 서비스의 상태 패널·각 섹션과 대시보드에서 들어온다. 주소로 거른 채 열 수 있다:
   ?category=mail · ?provider=gemini 또는 ?provider=fish,google_tts,edge(여럿) · ?result=fail
   ?demo 를 붙이면 예시 기록으로 화면을 미리 본다(저장하지 않는다). */
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { ChevronDown, History, Settings } from "@/components/icons";
import { useLanguage } from "@/providers/LanguageProvider";
import AdminListShell from "@/components/admin/AdminListShell";
import Button from "@/components/ui/Button";
import Pressable from "@/components/ui/Pressable";
import HelpButton from "@/components/ui/HelpButton";
import Popover from "@/components/ui/Popover";
import { useAiHealth, type ProviderState } from "../settings/_components/useAiHealth";
import AiHealthPanel from "../settings/_components/AiHealthPanel";
import SegmentedControl from "@/components/ui/SegmentedControl";
import { SkeletonLine } from "@/components/ui/Skeleton";
import { sendAction, tryRequest } from "@/lib/sendAction";
import { fillTemplate } from "@/utils/format";
import { AI_PROVIDERS, AI_PROVIDER_INFO, type AiProvider } from "@/lib/ai/providers";
import { SERVICE_PROVIDER_LABEL, type ServiceLogCategory, type ServiceLogEntry } from "@/lib/serviceLogTypes";
import { demoServiceLog, DEMO_STATES } from "./demoEntries";
import styles from "./ServiceLog.module.css";

type Result = "all" | "ok" | "fail";
type Category = ServiceLogCategory | "all";

const CATEGORY_ORDER: ServiceLogCategory[] = ["ai", "mail", "github", "cron", "contact"];
const HEALTH_OPEN_KEY = "admin.serviceLog.healthOpen";
const HEALTH_OPEN_EVENT = "admin:service-log-health-open";
const readHealthOpen = () => { try { return localStorage.getItem(HEALTH_OPEN_KEY) !== "0"; } catch { return true; } };
const subscribeHealthOpen = (cb: () => void) => {
  window.addEventListener(HEALTH_OPEN_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => { window.removeEventListener(HEALTH_OPEN_EVENT, cb); window.removeEventListener("storage", cb); };
};

/* 종류마다 기록을 남기는 공급자·작업 — 아직 기록이 없어도 왼쪽 목록에 0 으로 보인다 */
const KNOWN_PROVIDERS: Record<ServiceLogCategory, string[]> = {
  ai: [...AI_PROVIDERS],
  mail: ["resend"],
  github: ["github"],
  cron: ["publish-scheduled", "purge-trash-scheduled", "anonymize-site-visits"],
  contact: ["contact-attachment"],
};

type ProviderRef = Pick<ServiceLogEntry, "category" | "provider">;

export default function ServiceLogView() {
  const { t, language } = useLanguage();
  const th = (key: string) => t(`admin.aiHealth.${key}`);
  const [entries, setEntries] = useState<ServiceLogEntry[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [demo, setDemo] = useState(false);
  const [category, setCategory] = useState<Category>("all");
  const [provider, setProvider] = useState<string>("all");
  const [result, setResult] = useState<Result>("all");
  const [clearing, setClearing] = useState(false);
  /* 펼친 기록 줄 — 누르면 잘린 메시지 전체와 상세가 아래에 열린다 */
  const [openRow, setOpenRow] = useState<string | null>(null);
  /* 공급자의 지금 상태(정상·실패 중·꺼짐·키 없음) — 설정 › 서비스 상태 패널과 같은 기준. 예시 모드면 예시 상태 */
  const health = useAiHealth();
  /* 위의 상태 표를 접었는지 — 접은 채로 두면 다음에도 접혀 있다(이 브라우저만). 저장소 값은 서버에 없으니
     uSES 로 읽는다(서버 스냅샷은 "펼침") — 효과에서 setState 로 되돌리면 한 번 더 그린다 */
  const healthOpen = useSyncExternalStore(subscribeHealthOpen, readHealthOpen, () => true);
  const toggleHealth = () => {
    try { localStorage.setItem(HEALTH_OPEN_KEY, healthOpen ? "0" : "1"); } catch { /* 저장소 없음 — 그대로 둔다 */ }
    window.dispatchEvent(new Event(HEALTH_OPEN_EVENT));
  };
  /* 머리의 한 줄 요약 — 실패 중 · 꺼짐 · 키 없음 수. 전부 정상이면 "모두 정상" */
  const healthSummary = useMemo(() => {
    if (!health.data) return null;
    const counts = { failing: 0, off: 0, nokey: 0 };
    for (const p of AI_PROVIDERS) {
      const st = health.stateOf(p);
      if (st === "failing" || st === "off" || st === "nokey") counts[st] += 1;
    }
    return counts;
  }, [health]);
  const stateOf = (e: ProviderRef): ProviderState | null =>
    e.category !== "ai" ? null : demo ? DEMO_STATES[e.provider] ?? "ok" : health.stateOf(e.provider as AiProvider);

  useEffect(() => {
    /* 주소의 ?category= · ?provider= · ?result= · ?demo — useSearchParams 는 프리렌더를 막아 쓰지 않는다 */
    const params = new URLSearchParams(window.location.search);
    const q = params.get("provider");
    const qCategory = params.get("category");
    const qResult = params.get("result");
    const applyQuery = () => {
      if (q) setProvider(q);
      if (qCategory && (CATEGORY_ORDER as string[]).includes(qCategory)) setCategory(qCategory as ServiceLogCategory);
      if (qResult === "ok" || qResult === "fail") setResult(qResult);
    };
    let alive = true;
    if (params.has("demo")) {
      /* 효과 안에서 바로 상태를 바꾸면 그리기가 한 번 더 이어진다 — 불러오기처럼 다음 차례에 넣는다 */
      void Promise.resolve().then(() => {
        if (!alive) return;
        setDemo(true);
        setEntries(demoServiceLog(Date.now()));
        applyQuery();
      });
      return () => { alive = false; };
    }
    void tryRequest("/api/admin/ai-log", { method: "GET" }).then(async (res) => {
      if (!alive) return;
      applyQuery();
      if (!(res instanceof Response)) { setFailed(true); return; }
      const data = await res.json().catch(() => null);
      setEntries(Array.isArray(data?.entries) ? data.entries : []);
    });
    return () => { alive = false; };
  }, []);

  const labelOf = (e: ProviderRef) =>
    e.category === "ai"
      ? AI_PROVIDER_INFO[e.provider as AiProvider]?.label ?? e.provider
      : SERVICE_PROVIDER_LABEL[e.provider]?.[language === "ko" ? "ko" : "en"] ?? e.provider;

  /* 공급자는 쉼표로 여럿 — 설정 화면의 한 기능(예: TTS 는 fish·google_tts·edge)에서 올 때 */
  const providerSet = useMemo(() => (provider === "all" ? null : new Set(provider.split(","))), [provider]);
  /* 결과(성공/실패) 거르기 전 — 오른쪽 머리의 건수가 이 범위 */
  const scoped = useMemo(() => (entries ?? []).filter((e) =>
    (category === "all" || e.category === category)
    && (!providerSet || providerSet.has(e.provider))), [entries, category, providerSet]);
  const shown = useMemo(() => scoped.filter((e) => result === "all" || (result === "ok" ? e.ok : !e.ok)), [scoped, result]);

  /* 왼쪽 목록 — 종류마다 공급자·작업의 건수와 실패 수(전체 기록 기준). 기록이 없는 것도 0 으로 둔다 */
  const rail = useMemo(() => {
    const map = new Map<string, { entry: ProviderRef; total: number; fail: number }>();
    for (const c of CATEGORY_ORDER) for (const key of KNOWN_PROVIDERS[c]) map.set(key, { entry: { category: c, provider: key }, total: 0, fail: 0 });
    for (const e of entries ?? []) {
      const s = map.get(e.provider) ?? { entry: { category: e.category, provider: e.provider }, total: 0, fail: 0 };
      s.total += 1;
      if (!e.ok) s.fail += 1;
      map.set(e.provider, s);
    }
    return CATEGORY_ORDER.map((c) => {
      const items = [...map.entries()].filter(([, v]) => v.entry.category === c).map(([key, v]) => ({ key, ...v }));
      return { category: c, items, total: items.reduce((n, i) => n + i.total, 0), fail: items.reduce((n, i) => n + i.fail, 0) };
    });
  }, [entries]);
  const allFail = (entries ?? []).filter((e) => !e.ok).length;

  /* 지금 보고 있는 것 — 오른쪽 머리의 제목 */
  const scopeLabel = providerSet
    ? rail.flatMap((g) => g.items).filter((i) => providerSet.has(i.key)).map((i) => labelOf(i.entry)).join(" · ") || provider
    : category !== "all" ? th(`logCategory.${category}`) : th("logAllProviders");
  const pick = (next: { category?: Category; provider?: string }) => {
    setCategory(next.category ?? "all");
    setProvider(next.provider ?? "all");
  };

  const clear = async () => {
    if (demo) { setEntries([]); return; }
    setClearing(true);
    const res = await sendAction("/api/admin/ai-log", { method: "DELETE" }, t, th("logClearFailed"));
    setClearing(false);
    if (res) setEntries([]);
  };

  const locale = language === "ko" ? "ko-KR" : "en-US";
  const when = (iso: string) => new Date(iso).toLocaleString(locale, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const okCount = scoped.filter((e) => e.ok).length;
  const detailOf = (e: ServiceLogEntry) => {
    /* 메일은 어떤 메일인지 앞에 */
    const purpose = e.meta?.purpose ? th(`logPurpose.${e.meta.purpose}`) : "";
    if (!e.ok) return <>{purpose && <span className={styles.purpose}>{purpose}</span>}<code>{e.message}</code></>;
    if (purpose) return purpose;
    if (e.units === undefined || e.units === null) return "";
    if (e.category === "cron") return fillTemplate(th("logCronCount"), { n: e.units.toLocaleString(locale) });
    if (e.category === "ai") return `${e.units.toLocaleString(locale)} ${th(`unit.${AI_PROVIDER_INFO[e.provider as AiProvider]?.unit ?? "requests"}`)}`;
    return "";
  };

  return (
    <AdminListShell
      title={
        <span className={styles.titleRow}>
          <History size={20} strokeWidth={1.6} aria-hidden />
          {th("logTitle")}
        </span>
      }
      headerExtra={
        <span className={styles.headerActions}>
          <Button variant="ghost" size="sm" shape="capsule" href="/admin/settings?tab=services" soundDisabled icon={<Settings size={14} strokeWidth={1.8} />}>
            {th("logToSettings")}
          </Button>
          <Button variant="outline" size="sm" shape="capsule" onClick={() => void clear()} loading={clearing} disabled={!entries?.length} soundDisabled>
            {th("logClear")}
          </Button>
        </span>
      }
    >
      <div className={styles.page}>
        {demo && <p className={styles.demo}>{th("logDemo")}</p>}
        {/* 무엇을 남기는지 — 줄마다 한 가지 */}
        <ul className={styles.hintList}>
          {th("logHint").split("\n").map((line) => <li key={line}>{line}</li>)}
        </ul>

        {/* AI·외부 서비스 상태 — 설정 › 서비스의 표와 같다(같은 useAiHealth). 예시 모드에서는 예시 상태와 어긋나니 뺀다 */}
        {!demo && (
          <section className={styles.health} aria-labelledby="service-log-health">
            <div className={styles.healthHead}>
              <h2 id="service-log-health" className={styles.healthTitle}>{th("title")}</h2>
              {healthSummary && (
                <span className={styles.healthSummary}>
                  {healthSummary.failing + healthSummary.off + healthSummary.nokey === 0
                    ? th("logState.ok")
                    : ([
                      healthSummary.failing > 0 && `${th("logState.failing")} ${healthSummary.failing}`,
                      healthSummary.off > 0 && `${th("logState.off")} ${healthSummary.off}`,
                      healthSummary.nokey > 0 && `${th("logState.nokey")} ${healthSummary.nokey}`,
                    ].filter(Boolean) as string[]).join(" · ")}
                </span>
              )}
              <span className={styles.healthToggle}>
                <Button
                  variant="ghost"
                  size="sm"
                  shape="capsule"
                  onClick={toggleHealth}
                  aria-expanded={healthOpen}
                  aria-controls="service-log-health-body"
                  soundDisabled
                  icon={<ChevronDown size={14} strokeWidth={2} style={{ transform: healthOpen ? "rotate(180deg)" : undefined, transition: "transform var(--duration-base) var(--ease-standard)" }} />}
                >
                  {th(healthOpen ? "panelClose" : "panelOpen")}
                </Button>
              </span>
            </div>
            {healthOpen && (
              <div id="service-log-health-body" className={styles.healthBody}>
                <AiHealthPanel health={health} />
              </div>
            )}
          </section>
        )}

        {entries === null ? (
          failed ? <p className={styles.empty}>{th("logLoadFailed")}</p> : <ServiceLogSkeleton />
        ) : entries.length === 0 ? (
          /* 기록이 없으면 예시로 화면을 미리 볼 수 있게 — 같은 화면에 예시 기록을 그린다(저장하지 않음) */
          <div className={styles.emptyRow}>
            <p className={styles.empty}>{th("logEmpty")}</p>
            {!demo && (
              <Button
                variant="outline"
                size="sm"
                shape="capsule"
                onClick={() => { setDemo(true); setEntries(demoServiceLog(Date.now())); }}
                soundDisabled
              >
                {th("logShowDemo")}
              </Button>
            )}
          </div>
        ) : (
          /* 왼쪽: 종류별 공급자 목록(누르면 오른쪽 기록이 걸러진다) · 오른쪽: 기록 */
          <div className={styles.split}>
            <nav className={styles.rail} aria-label={th("logColProvider")} data-lenis-prevent-wheel>
              {/* 목록 머리 — 점·숫자·알약이 무엇인지 i 로 */}
              <div className={styles.railHeader}>
                <span>{th("logColProvider")}</span>
                <Popover placement="bottom-start" responsive={false} maxHeight={false} contentClassName={styles.legend} trigger={<HelpButton symbol="i" size="xs" aria-label={th("logLegendTitle")} title={th("logLegendTitle")} soundDisabled />}>
                  <div className={styles.legendBody}>
                    <p className={styles.legendTitle}>{th("logLegendTitle")}</p>

                    {/* 한 줄 읽기 — 실제 목록 한 줄을 예시로 두고, 그 아래에 칸마다 뜻 */}
                    <div className={styles.legendSection}>
                      <span className={styles.legendHeading}>{th("logLegendRow")}</span>
                      <div className={`${styles.railItem} ${styles.legendExample}`} aria-hidden>
                        <span className={styles.railDot} data-state="failing" />
                        <span className={styles.railName}>Gemini</span>
                        <span className={styles.railCount}>9</span>
                        <span className={styles.railFailSlot}><span className={styles.railFail}>2</span></span>
                      </div>
                      {/* 예시 줄 바로 아래, 같은 칸 폭으로 이름표 */}
                      <div className={styles.legendCaptions} aria-hidden>
                        <span>{th("logLegendCapState")}</span>
                        <span className={styles.legendCapNum}>{th("logLegendCapCount")}</span>
                        <span className={styles.legendCapNum}>{th("logLegendCapFail")}</span>
                      </div>
                      <p className={styles.legendText2}>{th("logLegendRowDesc")}</p>
                    </div>

                    {/* 점 색 — 2×2 */}
                    <div className={styles.legendSection}>
                      <span className={styles.legendHeading}>{th("logLegendStates")}</span>
                      <ul className={styles.legendStates}>
                        {(["ok", "failing", "off", "nokey"] as const).map((st) => (
                          <li key={st}>
                            <span className={styles.legendStateName}>
                              <span className={styles.railDot} data-state={st} aria-hidden />
                              {th(`logState.${st}`)}
                            </span>
                            <span className={styles.legendStateDesc}>{th(`logStateDesc.${st}`)}</span>
                          </li>
                        ))}
                      </ul>
                      <p className={styles.legendNote}>
                        <span className={styles.railDot} aria-hidden />
                        {th("logLegendNoState")}
                      </p>
                    </div>
                  </div>
                </Popover>
              </div>
              {/* 전체 — 큰 숫자로 요약. 누르면 거르기를 푼다 */}
              <Pressable className={styles.railTotal} data-active={category === "all" && !providerSet ? "" : undefined} onClick={() => pick({})}>
                <span className={styles.railTotalLabel}>{th("logAllProviders")}</span>
                <span className={styles.railTotalNums}>
                  <span className={styles.railTotalNum}>{entries.length}</span>
                  <span className={styles.railTotalFail} data-zero={allFail === 0 ? "" : undefined}>
                    {fillTemplate(th("logRailFails"), { n: allFail })}
                  </span>
                </span>
              </Pressable>
              {rail.map((g) => (
                <div key={g.category} className={styles.railGroup}>
                  <Pressable
                    className={`${styles.railItem} ${styles.railHead}`}
                    data-active={category === g.category && !providerSet ? "" : undefined}
                    onClick={() => pick({ category: g.category })}
                  >
                    <span className={styles.railName}>{th(`logCategory.${g.category}`)}</span>
                    <span className={styles.railCount}>{g.total}</span>
                    {/* 실패가 없어도 자리는 둔다 — 건수 칸이 줄마다 같은 자리에 오게 */}
                    <span className={styles.railFailSlot}>{g.fail > 0 && <span className={styles.railFail}>{g.fail}</span>}</span>
                  </Pressable>
                  {g.items.map((i) => (
                    <Pressable
                      key={i.key}
                      className={`${styles.railItem} ${styles.railSub}`}
                      data-active={providerSet?.has(i.key) ? "" : undefined}
                      onClick={() => pick({ provider: i.key })}
                    >
                      {/* 지금 상태 — AI·외부 공급자만. 켜고 끄는 개념이 없는 종류는 자리만 둔다 */}
                      <span className={styles.railDot} data-state={stateOf(i.entry) ?? undefined} title={stateOf(i.entry) ? th(`logState.${stateOf(i.entry)}`) : undefined} aria-hidden />
                      <span className={styles.railName}>{labelOf(i.entry)}</span>
                      <span className={styles.railCount}>{i.total}</span>
                      <span className={styles.railFailSlot}>{i.fail > 0 && <span className={styles.railFail}>{i.fail}</span>}</span>
                    </Pressable>
                  ))}
                </div>
              ))}
            </nav>

            <div className={styles.main}>
              <div className={styles.bar}>
                <span className={styles.scope}>{scopeLabel}</span>
                <SegmentedControl<Result>
                  size="sm"
                  items={[
                    { value: "all", label: th("logAll") },
                    { value: "ok", label: th("logOk") },
                    { value: "fail", label: th("logFail") },
                  ]}
                  value={result}
                  onChange={setResult}
                />
                <span className={styles.count}>
                  {fillTemplate(th("logSummary"), { n: scoped.length, ok: okCount, fail: scoped.length - okCount })}
                </span>
              </div>

              {shown.length === 0 ? (
                <p className={styles.empty}>{th("logNoMatch")}</p>
              ) : (
                /* 표 하나(subgrid) — 결과 배지 열 폭이 가장 긴 배지에 맞춰져 메시지 시작점이 줄마다 같다.
                   좁으면 가로로 밀고, 시각·공급자 열은 왼쪽에 붙어 있다 */
                <div className={styles.tableScroll}>
                  <ul className={styles.list}>
                    {shown.map((e, i) => {
                      const key = `${e.at}-${i}`;
                      const isOpen = openRow === key;
                      return (
                        <li key={key}>
                          <Pressable
                            className={styles.row}
                            data-open={isOpen ? "" : undefined}
                            aria-expanded={isOpen}
                            onClick={() => setOpenRow(isOpen ? null : key)}
                            soundDisabled
                          >
                            <span className={`${styles.time} ${styles.pin}`}>{when(e.at)}</span>
                            <span className={`${styles.provider} ${styles.pin} ${styles.pin2}`}>{labelOf(e)}</span>
                            <span className={styles.status} data-ok={e.ok ? "" : undefined}>
                              {e.ok ? th("logOk") : th(`kind.${e.kind ?? "unknown"}`)}
                            </span>
                            <span className={styles.detail}>{detailOf(e)}</span>
                          </Pressable>
                          {isOpen && (
                            <dl className={styles.rowMore}>
                              <dt>{th("logDetailTime")}</dt><dd>{new Date(e.at).toLocaleString(locale)}</dd>
                              <dt>{th("logColProvider")}</dt><dd>{labelOf(e)} <code>{e.provider}</code></dd>
                              <dt>{th("logDetailResult")}</dt>
                              <dd>
                                {e.ok ? th("logOk") : th(`kind.${e.kind ?? "unknown"}`)}
                                {e.status ? <code>HTTP {e.status}</code> : null}
                              </dd>
                              {e.meta?.purpose && (<><dt>{th("logDetailPurpose")}</dt><dd>{th(`logPurpose.${e.meta.purpose}`)}</dd></>)}
                              {e.units !== undefined && e.units !== null && (<><dt>{th("logDetailUnits")}</dt><dd>{e.units.toLocaleString(locale)}</dd></>)}
                              {e.message && (<><dt>{th("logDetailMessage")}</dt><dd><pre className={styles.rowMessage}>{e.message}</pre></dd></>)}
                            </dl>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminListShell>
  );
}

/** 불러오는 동안 — 실제 화면과 같은 모양(왼쪽 공급자 목록 · 오른쪽 거르기 줄과 기록 줄) */
function ServiceLogSkeleton() {
  return (
    <div className={styles.split} aria-hidden>
      <div className={styles.rail}>
        {[90, 60, 110, 96, 70, 60, 104].map((w, i) => (
          <div key={i} className={`${styles.railItem} ${i === 1 || i === 5 ? styles.railHead : i > 1 ? styles.railSub : ""}`}>
            <SkeletonLine width={`${w}px`} height="12px" />
          </div>
        ))}
      </div>
      <div className={styles.main}>
        <div className={styles.bar}>
          <SkeletonLine width="120px" height="16px" />
          <SkeletonLine width="140px" height="28px" className={styles.skeletonCapsule} />
        </div>
        <div className={styles.list}>
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className={styles.row}>
              <SkeletonLine width="130px" height="12px" />
              <SkeletonLine width="90px" height="14px" />
              <SkeletonLine width="44px" height="20px" className={styles.skeletonCapsule} />
              <SkeletonLine width={`${[40, 70, 0, 55, 30, 65, 45][i] || 10}%`} height="12px" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
