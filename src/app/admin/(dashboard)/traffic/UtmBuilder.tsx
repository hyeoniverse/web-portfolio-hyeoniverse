"use client";

import styles from "./UtmBuilder.module.css";
import { useState, useSyncExternalStore } from "react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import Popover from "@/components/ui/Popover";
import Pressable from "@/components/ui/Pressable";
import { useLanguage } from "@/providers/LanguageProvider";
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
/* language 는 호출부 호환용 — 글은 사전 t() 로 고른다 */
export function UtmHelpButton(_props: { language: "ko" | "en" }) {
  const { t } = useLanguage();
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
          aria-label={t("admin.inline.utmBuilder.aboutUtm")}
        >
          <HelpCircle size={13} strokeWidth={2} />
        </Pressable>
      }
    >
      <div className={styles.helpContent}>
        <p className={styles.helpTitle}>{t("admin.inline.utmBuilder.whatIsUtm")}</p>
        <p className={styles.helpText}>
          {t("admin.inline.utmBuilder.utmHelp")}
        </p>
        <ul className={styles.helpParams}>
          <li>
            <code>source</code>
            <span>
              {t("admin.inline.utmBuilder.sourceHint")}
            </span>
          </li>
          <li>
            <code>medium</code>
            <span>
              {t("admin.inline.utmBuilder.howItTravelsE")}
            </span>
          </li>
          <li>
            <code>campaign</code>
            <span>
              {t("admin.inline.utmBuilder.theEffortOrSeason")}
            </span>
          </li>
        </ul>
        <p className={styles.helpTitle}>{t("admin.inline.utmBuilder.howToUse")}</p>
        <ol className={styles.helpSteps}>
          <li>{t("admin.inline.utmBuilder.sourcePickHint")}</li>
          <li>{t("admin.inline.utmBuilder.fillPathMediumCampaign")}</li>
          <li>
            {t("admin.inline.utmBuilder.useTheCopiedLink")}
          </li>
        </ol>
        <code className={styles.helpExample}>?utm_source=resume&utm_campaign=2026</code>
      </div>
    </Popover>
  );
}

function UtmBuilder({
  siteUrl,
}: {
  language: "ko" | "en";
  /** 링크의 기준 도메인 — SITE_URL(정본). 비어 있으면(dev) 현재 origin 폴백 */
  siteUrl?: string;
}) {
  const { t } = useLanguage();
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


  return (
    <div className={styles.builder}>
      <div className={styles.fieldsGrid}>
        {/* 출처 + 경로 — 한 캡슐로 묶은 그룹 (좌: 출처 Select, 우: 경로 입력) */}
        <div className={styles.comboCell}>
          <span className={styles.fieldLabel}>{t("admin.inline.utmBuilder.sourcePath")}</span>
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
              aria-label={t("admin.inline.utmBuilder.path")}
              className={styles.comboPath}
            />
          </div>
        </div>
        <Input
          label={t("admin.inline.utmBuilder.medium")}
          value={medium}
          onChange={setMedium}
          placeholder="utm_medium"
        />
        <Input
          label={t("admin.inline.utmBuilder.campaign")}
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
          {copied ? t("admin.inline.utmBuilder.copied") : t("admin.inline.utmBuilder.copy")}
        </Button>
      </div>
    </div>
  );
}

export default UtmBuilder;
