"use client";

import styles from "./UtmBuilder.module.css";
import { useState, useSyncExternalStore } from "react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import Popover from "@/components/ui/Popover";
import Pressable from "@/components/ui/Pressable";
import { Check, Copy, FileText, HelpCircle, MessageCircle, PenLine, SocialBrandIcon } from "@/components/icons";

/* ── UTM 링크 생성기(#1161) — 이력서·SNS·DM 에 뿌릴 링크에 utm_* 를 붙여 준다.
   카톡·노션·PDF 처럼 referrer 가 안 남는 경로도 UTM 이면 유입이 구분된다.
   출처는 공통 Select 의 editable 모드(PeriodPicker 와 같은 문법) — 드롭다운으로
   프리셋을 고르고, 더블클릭하면 자유 입력으로 전환된다. */

/** 자주 쓰는 출처 — value 가 그대로 utm_source 값이 된다 */
const SOURCE_OPTIONS = [
  { value: "resume", label: "resume", icon: <FileText size={13} strokeWidth={2} /> },
  { value: "linkedin", label: "linkedin", icon: <SocialBrandIcon name="linkedin" size={13} /> },
  { value: "x", label: "x", icon: <SocialBrandIcon name="twitter" size={13} /> },
  { value: "kakao", label: "kakao", icon: <MessageCircle size={13} strokeWidth={2} /> },
  { value: "email", label: "email", icon: <SocialBrandIcon name="email" size={13} /> },
];

/** 패널 제목 옆 ? — UTM 이 뭔지·어떻게 쓰는지 (SearchCapsule 의 문법 도움말과 같은 패턴) */
export function UtmHelpButton({ language }: { language: "ko" | "en" }) {
  const ko = language === "ko";
  return (
    <Popover
      placement="bubble"
      openOnHover
      className={styles.helpWrap}
      contentClassName={styles.helpPopover}
      trigger={
        <Pressable
          noTapScale
          className={styles.helpBtn}
          aria-label={ko ? "UTM 도움말" : "About UTM"}
        >
          <HelpCircle size={13} strokeWidth={2} />
        </Pressable>
      }
    >
      <div className={styles.helpContent}>
        <p className={styles.helpTitle}>{ko ? "UTM이란" : "What is UTM?"}</p>
        <p className={styles.helpText}>
          {ko
            ? "링크 뒤에 붙는 출처 표식입니다(utm_source·utm_medium·utm_campaign). 카카오톡·노션·PDF처럼 방문 기록에 출처가 안 남는 경로에서도 어떤 링크로 왔는지 구분해 줍니다."
            : "Tracking parameters appended to a link (utm_source·utm_medium·utm_campaign). They identify which link a visit came from, even where no referrer survives — messengers, Notion, PDFs."}
        </p>
        <ul className={styles.helpParams}>
          <li>
            <code>source</code>
            <span>
              {ko
                ? "출처 — 링크를 올린 곳입니다. 예: resume, linkedin"
                : "where you posted the link, e.g. resume, linkedin"}
            </span>
          </li>
          <li>
            <code>medium</code>
            <span>
              {ko
                ? "매체 — 전달 방식입니다. 예: social, email, qr"
                : "how it travels, e.g. social, email, qr"}
            </span>
          </li>
          <li>
            <code>campaign</code>
            <span>
              {ko
                ? "캠페인 — 활동·시기 이름입니다. 예: job-2026"
                : "the effort or season, e.g. job-2026"}
            </span>
          </li>
        </ul>
        <p className={styles.helpTitle}>{ko ? "만드는 법" : "How to use"}</p>
        <ol className={styles.helpSteps}>
          <li>{ko ? "출처를 고르거나, 더블클릭해 직접 입력합니다." : "Pick a source, or double-click to type your own."}</li>
          <li>{ko ? "필요하면 경로·매체·캠페인을 채웁니다." : "Fill path, medium, campaign as needed."}</li>
          <li>
            {ko
              ? "복사한 링크를 이력서·프로필·DM에 씁니다. 그 링크로 들어온 방문이 UTM 캠페인 목록에 집계됩니다."
              : "Use the copied link in your resume, profiles, or DMs. Visits from it show up in the UTM campaigns list."}
          </li>
        </ol>
        <code className={styles.helpExample}>?utm_source=resume&utm_campaign=2026</code>
      </div>
    </Popover>
  );
}

function UtmBuilder({
  language,
  siteUrl,
}: {
  language: "ko" | "en";
  /** 링크의 기준 도메인 — SITE_URL(정본). 비어 있으면(dev) 현재 origin 폴백 */
  siteUrl?: string;
}) {
  const [path, setPath] = useState("/");
  const [source, setSource] = useState("resume");
  const [medium, setMedium] = useState("");
  const [campaign, setCampaign] = useState("");
  const [copied, setCopied] = useState(false);

  /* window 는 SSR 에 없다 — uSES 로 서버 스냅샷("")과 클라 값을 가른다.
     effect 에서 setState 로 채우면 연쇄 렌더 경고가 난다 */
  const origin = useSyncExternalStore(
    () => () => {},
    () => window.location.origin,
    () => "",
  );

  const base = siteUrl || origin;
  const normPath = path.startsWith("/") ? path : `/${path}`;
  const params = new URLSearchParams();
  if (source.trim()) params.set("utm_source", source.trim());
  if (medium.trim()) params.set("utm_medium", medium.trim());
  if (campaign.trim()) params.set("utm_campaign", campaign.trim());
  const url = `${base}${normPath}${params.size > 0 ? `?${params.toString()}` : ""}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard 권한이 없으면 선택이라도 되게 — 결과 줄은 클릭 시 전체 선택된다 */
    }
  };

  const L = (ko: string, en: string) => (language === "ko" ? ko : en);

  return (
    <div className={styles.builder}>
      <div className={styles.fieldsGrid}>
        {/* 출처 + 경로 — 한 캡슐로 묶은 그룹 (좌: 출처 Select, 우: 경로 입력) */}
        <div className={styles.comboCell}>
          <span className={styles.fieldLabel}>{L("출처 · 경로", "Source · Path")}</span>
          {/* 한 캡슐 안에서 [출처 │ 경로] — 가운데 세로 hairline 으로 나눈다 */}
          <div className={styles.comboCapsule}>
            <Select
              value={source}
              options={SOURCE_OPTIONS}
              onChange={setSource}
              showCheck
              editable
              editableInputProps={{ placeholder: "utm_source" }}
              triggerClassName={styles.comboTrigger}
              renderValue={(sel) =>
                sel ? (
                  <span className={styles.triggerValue}>
                    {sel.icon}
                    <span>{sel.label}</span>
                  </span>
                ) : source ? (
                  /* 직접 입력한 값 — 프리셋 목록에 없어도 트리거에 그대로 보여준다 */
                  <span className={styles.triggerValue}>
                    <PenLine size={13} strokeWidth={2} />
                    <span>{source}</span>
                  </span>
                ) : (
                  "utm_source"
                )
              }
            />
            <span className={styles.comboDivider} aria-hidden />
            <Input
              value={path}
              onChange={setPath}
              placeholder="/"
              aria-label={L("경로", "Path")}
              className={styles.comboPath}
            />
          </div>
        </div>
        <Input
          label={L("매체", "Medium")}
          value={medium}
          onChange={setMedium}
          placeholder="utm_medium"
        />
        <Input
          label={L("캠페인", "Campaign")}
          value={campaign}
          onChange={setCampaign}
          placeholder="utm_campaign"
        />
      </div>
      <div className={styles.builderResult}>
        <code
          className={styles.builderUrl}
          onClick={(e) => {
            const range = document.createRange();
            range.selectNodeContents(e.currentTarget);
            window.getSelection()?.removeAllRanges();
            window.getSelection()?.addRange(range);
          }}
        >
          {url}
        </code>
        <Button
          variant="outline"
          icon={copied ? <Check size={13} strokeWidth={2} /> : <Copy size={13} strokeWidth={2} />}
          onClick={copy}
        >
          {copied ? L("복사됨", "Copied") : L("복사", "Copy")}
        </Button>
      </div>
    </div>
  );
}

export default UtmBuilder;
