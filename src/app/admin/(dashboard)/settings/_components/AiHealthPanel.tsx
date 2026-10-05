"use client";

/* ── AI·외부 서비스 상태 (settings > 서비스 · service-log) ──
   공급자마다 이어진 실패와 원인(키 만료·권한·한도…), 꺼졌는지, 이번 달 사용량과 무료 한도를 보인다(lib/ai/health).
   같은 원인으로 여러 번 이어 실패해 꺼진 공급자는 원인을 고친 뒤 여기서 다시 켠다. 키를 바꾸면 저절로 풀린다.
   탭의 "저장 / 되돌리기"와 상관없이 바로 반영된다.
   표(AiHealthPanel)는 서비스 호출 기록 페이지가 그리고, 설정 › 서비스는 같은 조각(ProviderHealthInline · Detail)을
   기능별 순서 줄에 붙여 쓴다 — 표를 따로 두지 않는다. */
import { useState } from "react";
import { ChevronDown, ChevronRight, Copy, ExternalLink, History, ListX, Power, PowerOff } from "@/components/icons";
import { useRouter } from "next/navigation";
import Popover, { MenuDivider, MenuItem } from "@/components/ui/Popover";

import { useLanguage } from "@/providers/LanguageProvider";
import Button from "@/components/ui/Button";
import Tooltip from "@/components/ui/Tooltip";
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
        {status && <><span className={styles.messageSep} aria-hidden>·</span><Tooltip content={th(`statusClass.${status[0]}`)}><span className={styles.messageStatus} data-class={status[0]}>{status}</span></Tooltip></>}
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

type Health = ReturnType<typeof useAiHealth>;

function useFmt() {
  const { t, language } = useLanguage();
  const th = (key: string) => t(`admin.aiHealth.${key}`);
  const nf = (n: number) => n.toLocaleString(language === "ko" ? "ko-KR" : "en-US");
  const when = (iso?: string) => (iso ? new Date(iso).toLocaleString(language === "ko" ? "ko-KR" : "en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "");
  return { t, th, nf, when };
}

/** 공급자 한 줄의 상태 조각 — 상태 배지(칸 폭 고정) · 원인 한마디 · 이번 달 사용량 · 단추(다시 켜기 · 기록 · 콘솔 · 펼치기).
 *  상태 표(AiHealthPanel)와 설정 › 서비스의 기능 줄(순서 상자 오른쪽)이 같은 조각을 쓴다. 상태가 아직 없으면 아무것도 안 그린다 */
export function ProviderHealthInline({ provider: p, health, open, onToggle, power }: {
  provider: AiProvider; health: Health; open: boolean; onToggle: () => void;
  /** 이 기능에서 쓸지(순서 줄) — 없으면(표 · 사진 공급자) 자동으로 꺼진 것을 다시 켜는 ⏻ 만 */
  power?: { enabled: boolean; locked: boolean; toggle: () => void };
}) {
  const { t, th } = useFmt();
  const router = useRouter();
  const { data, reload, stateOf } = health;
  const [resetting, setResetting] = useState(false);
  const [logMenu, setLogMenu] = useState(false);
  const info = AI_PROVIDER_INFO[p] as (typeof AI_PROVIDER_INFO)[AiProvider] | undefined;
  /* 설정에 남은 이름이 이 코드의 공급자 표에 없을 수 있다(다른 브랜치에서 저장한 공급자 등) — 조각을 비운다 */
  if (!data || !info) return null;
  const h = data.health[p];
  const u = data.usage.providers[p];
  /* 시간이 지나 다시 시도할 차례가 된 차단은 꺼짐이 아니라 실패 중으로 보인다(lib/ai/status) */
  const state = stateOf(p) ?? "ok";
  const off = state === "off";
  const failing = !off && (h?.fails ?? 0) > 0;
  const kind = h?.disabled?.kind ?? h?.kind;
  /* 다시 켜기 · 기록 지우기 — 둘 다 그 공급자의 실패 기록을 지운다(꺼짐도 풀린다) */
  const clear = async () => {
    setResetting(true);
    const res = await sendAction("/api/admin/ai-health", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: p }),
    }, t, th("resetFailed"));
    setResetting(false);
    if (res) await reload();
  };
  return (
    <>
      {/* 글 묶음(상태 · 원인 · 사용량)과 단추 묶음 둘 — 좁으면 글 쪽만 말줄임되고 단추는 오른쪽 끝에 남는다 */}
      <span className={styles.meta}>
        {/* 칸 폭은 가장 긴 배지에 맞춰 고정, 배지 배경은 글자에 맞게 */}
        <span className={styles.statusCell}>
          <span className={styles.status} data-state={state}>
            {state === "off" ? th("stateOff")
              : state === "failing" ? fillTemplate(th("stateFailing"), { n: h!.fails, limit: FATAL_KINDS.has(h!.kind!) ? FATAL_LIMIT : TRANSIENT_LIMIT })
              : state === "nokey" ? th("stateNoKey")
              : th("stateOk")}
          </span>
        </span>
        {(off || failing) && kind && <span className={styles.kind}>{th(`kind.${kind}`)}</span>}
        <UsageLine provider={p} usage={u} deepl={p === "deepl" ? data.deepl : null} />
      </span>
      <span className={styles.actions}>
        {/* ⏻ — 자동으로 꺼졌으면 강조색 사선(누르면 다시 켬). 아니면 이 기능에서 쓸지(초록 = 쓰는 중, 흐림 사선 = 뺌, 1번은 잠금).
            순서가 없는 곳(표 · 사진 공급자)은 꺼졌을 때만 */}
        {off ? (
          <Tooltip content={th("reenable")}><Button variant="ghost" size="sm" shape="circle" className={styles.powerOff} onClick={() => void clear()} loading={resetting} aria-label={th("reenable")} soundDisabled icon={<PowerOff size={14} strokeWidth={2.25} />} /></Tooltip>
        ) : power ? (
          <Tooltip content={th(power.locked ? "featureLocked" : power.enabled ? "featureOn" : "featureOff")}>
            <Button variant="ghost" size="sm" shape="circle" className={power.enabled ? styles.powerOn : styles.powerExcluded} onClick={power.toggle} disabled={power.locked} aria-label={th(power.enabled ? "featureOn" : "featureOff")} aria-pressed={power.enabled} soundDisabled icon={power.enabled ? <Power size={14} strokeWidth={2.25} /> : <PowerOff size={14} strokeWidth={2.25} />} />
          </Tooltip>
        ) : (
          <span className={styles.actionBlank} aria-hidden />
        )}
        {/* 기록 — 메뉴로: 호출 기록 페이지(그 공급자로 걸러) 보기, 실패 중이면 이어진 실패 기록 지우기 */}
        <Popover
          menu
          open={logMenu}
          onOpenChange={setLogMenu}
          placement="bottom-end"
          trigger={
            <Tooltip content={th("logOpenOne")} disabled={logMenu}>
              <Button variant="ghost" size="sm" shape="circle" aria-label={th("logOpenOne")} aria-haspopup="menu" aria-expanded={logMenu} soundDisabled icon={<History size={14} strokeWidth={2} />} />
            </Tooltip>
          }
        >
          {({ close }) => (
            <div role="menu">
              <MenuItem icon={<History size={14} strokeWidth={2} />} label={th("logView")} onClick={() => { close(); router.push(`/admin/service-log?provider=${p}`); }} />
              <MenuDivider />
              {/* 지울 기록이 없으면 흐리게 — 메뉴에 무엇이 있는지는 늘 보인다 */}
              <MenuItem icon={<ListX size={14} strokeWidth={2} />} label={th("clear")} disabled={!failing && !off} onClick={() => { close(); void clear(); }} />
            </div>
          )}
        </Popover>
        {/* 콘솔이 없는 공급자(Edge)는 빈 칸을 둬 기록 · › 가 다른 줄과 같은 자리에 선다 */}
        {info.console ? (
          <Tooltip content={th("console")}><Button variant="ghost" size="sm" shape="circle" href={info.console} external aria-label={th("console")} soundDisabled icon={<ExternalLink size={14} strokeWidth={2} />} /></Tooltip>
        ) : (
          <span className={styles.actionBlank} aria-hidden />
        )}
        <Tooltip content={th(open ? "detailHide" : "detailShow")}>
          <Button variant="ghost" size="sm" shape="circle" onClick={onToggle} aria-expanded={open} aria-label={th(open ? "detailHide" : "detailShow")} soundDisabled icon={<ChevronRight size={14} strokeWidth={2} className={`${styles.detailChev} ${open ? styles.detailChevOpen : ""}`} />} />
        </Tooltip>
      </span>
    </>
  );
}

/** 공급자 한 줄의 상세 — 원인 전문 · 최근 오류 · 사용량 막대와 한도 메모. 접힌 채로 그려 두고 grid 0fr→1fr 로 펼친다.
 *  className 은 안쪽 상자(왼쪽 들여쓰기 등) — 표에서는 이름 칸만큼, 기능 줄에서는 순서 상자 시작선에 맞춘다 */
export function ProviderHealthDetail({ provider: p, health, open, className }: { provider: AiProvider; health: Health; open: boolean; className?: string }) {
  const { th, when } = useFmt();
  const { data, stateOf } = health;
  if (!data || !(p in AI_PROVIDER_INFO)) return null;
  const h = data.health[p];
  const u = data.usage.providers[p];
  const state = stateOf(p) ?? "ok";
  const off = state === "off";
  const failing = !off && (h?.fails ?? 0) > 0;
  const kind = h?.disabled?.kind ?? h?.kind;
  return (
    <div className={styles.detailWrap} data-open={open ? "" : undefined} aria-hidden={!open || undefined}>
      <div className={`${styles.detail} ${className ?? ""}`} inert={!open || undefined}>
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
        <Usage provider={p} usage={u} deepl={p === "deepl" ? data.deepl : null} now={data.loadedAt} />
      </div>
    </div>
  );
}

/** 상태는 부모가 불러 넘긴다(useAiHealth) — 서비스 호출 기록 페이지의 상태 보기 */
export default function AiHealthPanel({ health }: { health: Health }) {
  const { th } = useFmt();
  const { data, failed, stateOf } = health;
  /* 줄마다 상세를 펼쳤는지 — 기본은 접힘(원인 한마디 · 다시 켜기는 줄에 있다) */
  const [open, setOpen] = useState<Partial<Record<AiProvider, boolean>>>({});

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
        /* 그룹마다 작은 제목 아래 공급자 한 줄씩 — 이름 · 쓰임 · 상태 조각. 상세는 줄 끝 화살표로 */
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
                  const isOpen = open[p] ?? false;
                  const toggle = () => setOpen((o) => ({ ...o, [p]: !isOpen }));
                  return (
                    <li key={p} className={styles.row} data-state={stateOf(p) ?? "ok"} data-open={isOpen ? "" : undefined}>
                      {/* 줄 어디를 눌러도 펼친다 — 단추 · 링크 · 입력칸은 빼고 */}
                      <div
                        className={styles.head}
                        onClick={(e) => {
                          if ((e.target as HTMLElement).closest("button, a, input, label")) return;
                          toggle();
                        }}
                      >
                        <span className={styles.name}>{info.label}</span>
                        <span className={styles.features}>{info.features.map((f) => th(`feature.${f}`)).join(" · ")}</span>
                        <ProviderHealthInline provider={p} health={health} open={isOpen} onToggle={toggle} />
                      </div>
                      <ProviderHealthDetail provider={p} health={health} open={isOpen} className={styles.detailIndent} />
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
function UsageLine({ provider, usage, deepl }: { provider: AiProvider; usage: ProviderUsage | undefined; deepl: { count: number; limit: number } | null }) {
  const { th, nf } = useFmt();
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
function Usage({ provider, usage, deepl, now }: {
  provider: AiProvider;
  now: number;
  usage: ProviderUsage | undefined;
  deepl: { count: number; limit: number } | null;
}) {
  const { th, nf } = useFmt();
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
