"use client";

/* ── AI·외부 서비스 상태 (settings > 서비스 · service-log) ──
   공급자마다 이어진 실패와 원인(키 만료·권한·한도…), 꺼졌는지, 이번 달 사용량과 무료 한도를 보인다(lib/ai/health).
   같은 원인으로 여러 번 이어 실패해 꺼진 공급자는 원인을 고친 뒤 여기서 다시 켠다. 키를 바꾸면 저절로 풀린다.
   탭의 "저장 / 되돌리기"와 상관없이 바로 반영된다.
   머리(제목 · 설명 · 저장)는 부모가 그린다 — 설정 › 서비스의 "AI · 외부 서비스" 섹션, 서비스 호출 기록 페이지. */
import { useState } from "react";
import { ChevronDown, ChevronRight, Copy, ExternalLink, History, RotateCcw } from "@/components/icons";

import { useLanguage } from "@/providers/LanguageProvider";
import Button from "@/components/ui/Button";
import Pressable from "@/components/ui/Pressable";
import { showToast } from "@/stores/toastStore";
import { SkeletonLine } from "@/components/ui/Skeleton";
import { sendAction } from "@/lib/sendAction";
import { fillTemplate } from "@/utils/format";
import { highlightCode } from "@/utils/prismHighlight";
import { parseProviderMessage } from "@/lib/ai/providerMessage";
import {
  AI_PROVIDERS,
  AI_PROVIDER_INFO,
  FATAL_KINDS,
  FATAL_LIMIT,
  TRANSIENT_LIMIT,
  type AiProvider,
  type ProviderUsage,
} from "@/lib/ai/providers";
import type { useAiHealth } from "./useAiHealth";
import styles from "./AiHealthPanel.module.css";

const DAY = 24 * 60 * 60 * 1000;

/** 최근 오류 — 시각·상태 코드·문장을 먼저 보이고, 원문(JSON)은 접어 둔다.
 *  원문은 Prism 으로 색을 입힌다(HTML 은 Prism 이 이스케이프한다) */
function ProviderMessage({ message, at, th }: { message: string; at: string; th: (k: string) => string }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const { status, summary, pretty } = parseProviderMessage(message);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(pretty ? (status ? `${status}\n${pretty}` : pretty) : message);
      showToast(t("common.codeCopied"), "success");
    } catch {
      showToast(t("common.copyFailed"), "error");
    }
  };
  return (
    <div className={styles.message}>
      <p className={styles.messageHead}>
        <span className={styles.messageAt}>{at}</span>
        {status && <><span className={styles.messageSep} aria-hidden>·</span><span className={styles.messageStatus} data-class={status[0]} title={th(`statusClass.${status[0]}`)}>{status}</span></>}
      </p>
      <p className={styles.messageText}>{summary}</p>
      {pretty && (
        <>
          <div className={styles.rawBar}>
            <Pressable className={styles.rawToggle} onClick={() => setOpen((v) => !v)} aria-expanded={open}>
              <ChevronDown size={14} className={`${styles.rawChev} ${open ? styles.rawChevOpen : ""}`} />
              {th(open ? "rawHide" : "rawShow")}
            </Pressable>
            {open && (
              <Pressable className={styles.rawToggle} onClick={copy}>
                <Copy size={13} />
                {t("common.codeCopy")}
              </Pressable>
            )}
          </div>
          {open && (
            <pre className={styles.raw}>
              <code dangerouslySetInnerHTML={{ __html: highlightCode(status ? `${status}\n${pretty}` : pretty, "json").html }} />
            </pre>
          )}
        </>
      )}
    </div>
  );
}

/* 비슷한 공급자끼리 — 글을 다루는 AI(Gemini·OpenAI·Claude)는 번역과 요약을 같은 키로 해서 한데 둔다 */
const GROUPS: { id: string; providers: AiProvider[] }[] = [
  { id: "translation", providers: ["deepl", "google_translate"] },
  { id: "text", providers: ["gemini", "openai", "claude"] },
  { id: "image", providers: ["nanobanana", "huggingface"] },
  { id: "tts", providers: ["fish", "google_tts", "edge"] },
  { id: "stock", providers: ["unsplash", "pexels"] },
];

/** 상태는 부모가 불러 넘긴다(useAiHealth) — 서비스 탭의 기능 줄들도 같은 값으로 공급자 상태를 보인다 */
export default function AiHealthPanel({ health }: { health: ReturnType<typeof useAiHealth> }) {
  const { t, language } = useLanguage();
  const th = (key: string) => t(`admin.aiHealth.${key}`);
  const { data, failed, reload: load, stateOf } = health;
  const [resetting, setResetting] = useState<AiProvider | null>(null);
  /* 줄마다 상세(원인 전문 · 최근 오류 · 한도 메모)를 펼쳤는지 — 기본은 접힘(원인 한마디 · 다시 켜기는 줄에 있다) */
  const [open, setOpen] = useState<Partial<Record<AiProvider, boolean>>>({});
  /* 호출 기록은 따로 둔 페이지(/admin/service-log) — 공급자 줄에서 가면 그 공급자로 걸러 연다 */
  const logHref = (provider: AiProvider) => `/admin/service-log?provider=${provider}`;

  const reset = async (provider: AiProvider) => {
    setResetting(provider);
    const res = await sendAction("/api/admin/ai-health", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider }),
    }, t, th("resetFailed"));
    setResetting(null);
    if (res) await load();
  };

  const nf = (n: number) => n.toLocaleString(language === "ko" ? "ko-KR" : "en-US");
  const when = (iso?: string) => (iso ? new Date(iso).toLocaleString(language === "ko" ? "ko-KR" : "en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "");

  /* 키가 있거나, 기록이 남았거나, 이번 달 쓴 공급자만 — 키도 기록도 없는 것은 한 줄로 센다 */
  const shown = data ? AI_PROVIDERS.filter((p) => data.configured[p] || data.health[p] || data.usage.providers[p]) : [];
  const hidden = data ? AI_PROVIDERS.length - shown.length : 0;

  return (
    <div className={styles.panel}>
      {data === null ? (
        failed ? <p className={styles.empty}>{th("loadFailed")}</p> : (
          <div className={styles.list} aria-hidden>
            {[0, 1, 2].map((i) => (
              <div key={i} className={styles.row}>
                <SkeletonLine width="140px" />
                <SkeletonLine width="60%" />
              </div>
            ))}
          </div>
        )
      ) : (
        /* 그룹마다 작은 제목 아래 공급자 한 줄씩 — 이름 · 쓰임 · 상태(원인 한마디) · 이번 달 사용량 · 모델 · 단추.
           원인 전문 · 최근 오류 · 한도 메모는 줄 끝 화살표로 펼친다 */
        <div className={styles.groups}>
          {GROUPS.map(({ id, providers }) => {
            const group = providers.filter((p) => shown.includes(p));
            if (group.length === 0) return null;
            return (
              <section key={id} className={styles.group}>
                <h3 className={styles.groupTitle}>{th(`group.${id}`)}</h3>
                <ul className={styles.list}>
                {group.map((p) => {
                  const info = AI_PROVIDER_INFO[p];
                  const h = data.health[p];
                  const u = data.usage.providers[p];
                  /* 시간이 지나 다시 시도할 차례가 된 차단은 꺼짐이 아니라 실패 중으로 보인다(lib/ai/status) */
                  const state = stateOf(p) ?? "ok";
                  const off = state === "off";
                  const failing = !off && (h?.fails ?? 0) > 0;
                  const kind = h?.disabled?.kind ?? h?.kind;
                  const isOpen = open[p] ?? false;
                  return (
                    <li key={p} className={styles.row} data-state={state} data-open={isOpen ? "" : undefined}>
                      <div className={styles.head}>
                        <span className={styles.name}>{info.label}</span>
                        <span className={styles.features}>{info.features.map((f) => th(`feature.${f}`)).join(" · ")}</span>
                        <span className={styles.status} data-state={state}>
                          {state === "off" ? th("stateOff")
                            : state === "failing" ? fillTemplate(th("stateFailing"), { n: h!.fails, limit: FATAL_KINDS.has(h!.kind!) ? FATAL_LIMIT : TRANSIENT_LIMIT })
                            : state === "nokey" ? th("stateNoKey")
                            : th("stateOk")}
                        </span>
                        {(off || failing) && kind && <span className={styles.kind}>{th(`kind.${kind}`)}</span>}
                        <UsageLine provider={p} usage={u} deepl={p === "deepl" ? data.deepl : null} nf={nf} th={th} />
                        <span className={styles.actions}>
                          {(off || failing) && (
                            <Button variant={off ? "primary" : "outline"} size="sm" shape="capsule" onClick={() => void reset(p)} loading={resetting === p} soundDisabled icon={<RotateCcw size={14} strokeWidth={2} />}>
                              {th(off ? "reenable" : "clear")}
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" shape="circle" href={logHref(p)} aria-label={th("logOpenOne")} title={th("logOpenOne")} soundDisabled icon={<History size={14} strokeWidth={2} />} />
                          {info.console && (
                            <Button variant="ghost" size="sm" shape="circle" href={info.console} external aria-label={th("console")} title={th("console")} soundDisabled icon={<ExternalLink size={14} strokeWidth={2} />} />
                          )}
                          <Button variant="ghost" size="sm" shape="circle" onClick={() => setOpen((o) => ({ ...o, [p]: !isOpen }))} aria-expanded={isOpen} aria-label={th(isOpen ? "detailHide" : "detailShow")} title={th(isOpen ? "detailHide" : "detailShow")} soundDisabled icon={<ChevronRight size={14} strokeWidth={2} className={`${styles.detailChev} ${isOpen ? styles.detailChevOpen : ""}`} />} />
                        </span>
                      </div>

                      {/* 상세 — 접힌 채로 그려 두고 grid 0fr→1fr 로 펼친다 */}
                      <div className={styles.detailWrap} data-open={isOpen ? "" : undefined} aria-hidden={!isOpen || undefined}>
                        <div className={styles.detail} inert={!isOpen || undefined}>
                          {/* 원인과 고칠 방법 — 실패가 남아 있을 때만 */}
                          {(off || failing) && kind && (
                            <div className={styles.problem}>
                              <p className={styles.fix}>
                                <strong>{th(`kind.${kind}`)}</strong> {th(`fix.${kind}`)}
                                {off && ` ${th(FATAL_KINDS.has(kind) ? "offManual" : kind === "quota" ? "offMonth" : "offHour")}`}
                              </p>
                              {h?.message && <ProviderMessage message={h.message} at={when(h.at)} th={th} />}
                            </div>
                          )}
                          <Usage provider={p} usage={u} deepl={p === "deepl" ? data.deepl : null} now={data.loadedAt} nf={nf} th={th} />
                        </div>
                      </div>
                    </li>
                  );
                })}
                </ul>
              </section>
            );
          })}
        </div>
      )}
      {hidden > 0 && <p className={styles.empty}>{fillTemplate(th("hiddenCount"), { n: hidden })}</p>}
    </div>
  );
}

/** 줄 안의 사용량 한마디 — "이번 달 134,268 / 500,000 자 (27%)" 또는 "이번 달 3회". 막대 · 메모는 상세(Usage)에 */
function UsageLine({ provider, usage, deepl, nf, th }: { provider: AiProvider; usage: ProviderUsage | undefined; deepl: { count: number; limit: number } | null; nf: (n: number) => string; th: (key: string) => string }) {
  const info = AI_PROVIDER_INFO[provider];
  const unit = th(`unit.${info.unit}`);
  const used = deepl ? deepl.count : info.unit === "requests" ? usage?.requests ?? 0 : usage?.units ?? 0;
  const limit = deepl ? deepl.limit : info.freeMonthly;
  return (
    <span className={styles.usageInline} data-high={limit && used / (info.appCap ?? limit) >= 0.8 ? "" : undefined}>
      {limit
        ? fillTemplate(th("usageOf"), { used: nf(used), limit: nf(limit), unit, pct: Math.min(999, Math.round((used / limit) * 100)) })
        : fillTemplate(th("usageCount"), { n: nf(usage?.requests ?? 0) })}
    </span>
  );
}

/** 이번 달 사용량 — 무료 한도를 아는 공급자는 막대로, 모르는 공급자는 횟수만 */
function Usage({ provider, usage, deepl, now, nf, th }: {
  provider: AiProvider;
  now: number;
  usage: ProviderUsage | undefined;
  deepl: { count: number; limit: number } | null;
  nf: (n: number) => string;
  th: (key: string) => string;
}) {
  const info = AI_PROVIDER_INFO[provider];
  const unit = th(`unit.${info.unit}`);
  /* DeepL 은 공급자가 알려 준 실제 값(결제 주기 기준). 나머지는 이 앱이 센 값 */
  const used = deepl ? deepl.count : info.unit === "requests" ? usage?.requests ?? 0 : usage?.units ?? 0;
  const limit = deepl ? deepl.limit : info.freeMonthly;
  const cap = info.appCap;

  const notes: string[] = [];
  if (deepl) notes.push(th("sourceProvider"));
  else if (limit) notes.push(th("sourceApp"));
  if (cap) notes.push(fillTemplate(th("appCap"), { n: nf(cap), unit }));
  if (info.freeUntil) {
    const days = Math.ceil((new Date(`${info.freeUntil}T23:59:59`).getTime() - now) / DAY);
    notes.push(fillTemplate(th(days >= 0 ? "freeUntil" : "freeEnded"), { date: info.freeUntil, days }));
  }
  if (info.note) notes.push(th(`note.${info.note}`));
  if (!limit && !info.freeUntil && info.key && !info.note) notes.push(th(provider === "openai" || provider === "claude" ? "paidOnly" : "limitElsewhere"));
  if (!info.key) notes.push(th("noLimit"));

  return (
    <div className={styles.usage}>
      {limit ? (
        <>
          <span className={styles.usageText}>
            {fillTemplate(th("usageOf"), { used: nf(used), limit: nf(limit), unit, pct: Math.min(999, Math.round((used / limit) * 100)) })}
          </span>
          <span className={styles.bar} aria-hidden>
            <span className={styles.barFill} data-high={used / (cap ?? limit) >= 0.8 ? "" : undefined} style={{ width: `${Math.min(100, (used / limit) * 100)}%` }} />
            {cap && <span className={styles.barCap} style={{ left: `${(cap / limit) * 100}%` }} />}
          </span>
        </>
      ) : (
        <span className={styles.usageText}>
          {fillTemplate(th("usageCount"), { n: nf(usage?.requests ?? 0) })}
          {info.unit !== "requests" && usage ? ` · ${nf(usage.units)} ${unit}` : ""}
        </span>
      )}
      {notes.length > 0 && <span className={styles.usageNote}>{notes.join(" · ")}</span>}
    </div>
  );
}
