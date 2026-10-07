"use client";

/* ── 읽기 사전 (settings > 서비스 > TTS 블록 안의 하위 칸) ──
   슬라이드 음성을 만들 때 대본의 표기(코드 · 약어)를 읽을 말로 바꾸는 사전(lib/ttsLexicon).
   편집기는 갤러리 음성 편집의 창과 같이 쓴다(LexiconEditor). 바꾸는 즉시 저장되므로
   이 칸은 위쪽의 "탭 저장 / 되돌리기"와 상관없다. 편집 화면의 "설정에서 관리"는 #tts-lexicon 으로 와서 펼친 채로 연다 */
import { useCallback, useEffect, useState } from "react";
import { useLanguage } from "@/providers/LanguageProvider";
import LexiconEditor from "@/components/works/LexiconEditor";
import { HintLines } from "./EnvKeyHint";
import { tryRequest } from "@/lib/sendAction";
import { sanitizeLexicon, type LexiconLang } from "@/lib/ttsLexicon";
import { fillTemplate } from "@/utils/format";
import SettingsSubPanel from "./SettingsSubPanel";

const LEXICON_SECTION_ID = "tts-lexicon";

export default function LexiconManager() {
  const { t } = useLanguage();
  /* 접힌 머리의 "KO n개 · EN n개" — 처음엔 두 사전을 가볍게 읽고, 펼친 뒤엔 편집기가 바뀔 때마다 알려 준다 */
  const [counts, setCounts] = useState<Partial<Record<LexiconLang, number>>>({});
  useEffect(() => {
    let alive = true;
    for (const lang of ["ko", "en"] as const) {
      void tryRequest(`/api/works/tts/lexicon?lang=${lang}`, { method: "GET" }).then(async (res) => {
        const data = res instanceof Response ? await res.json().catch(() => ({})) : {};
        if (alive) setCounts((c) => ({ ...c, [lang]: sanitizeLexicon(data?.entries).length }));
      });
    }
    return () => { alive = false; };
  }, []);
  const onCountChange = useCallback((lang: LexiconLang, n: number) => setCounts((c) => (c[lang] === n ? c : { ...c, [lang]: n })), []);

  const summary = counts.ko === undefined && counts.en === undefined
    ? undefined
    : fillTemplate(t("admin.settings.lexicon.summary"), { ko: counts.ko ?? 0, en: counts.en ?? 0 });
  return (
    <SettingsSubPanel id={LEXICON_SECTION_ID} title={t("admin.settings.lexicon.title")} summary={summary}>
      <HintLines lines={[t("admin.settings.lexicon.hint")]} />
      <LexiconEditor onCountChange={onCountChange} />
    </SettingsSubPanel>
  );
}
