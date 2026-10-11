"use client";

import { createContext, useContext, useMemo, type HTMLAttributes, type ReactNode } from "react";
import T from "@/components/ui/T";
import Tooltip from "@/components/ui/Tooltip";
import { useLanguage } from "@/providers/LanguageProvider";
import { type BodyLabelKey, type BodyLabels, bodyLabelPair, fillLabel, mergeBodyLabels, uiBodyLabels } from "@/lib/bodyLabels";

/* 번역해 볼 때 서버가 준 상세 화면 라벨(lib/bodyLabels) — 없으면 null, 화면 언어(ko/en) 라벨을 쓴다 */
const BodyLabelsContext = createContext<Partial<BodyLabels> | null>(null);
/* ko · en 밖의 언어로 번역해 보고 있나 — 라벨 번역이 실패해도(override 없음) 참이다. 사람 이름을 영어 이름으로 */
const ForeignReadingContext = createContext(false);

/** 상세 화면 전체를 감싼다 — override 는 useContentTranslation 의 bodyLabels, foreign 은 번역이 걸렸는지(fields) */
export function BodyLabelsProvider({ override, foreign = false, children }: { override: Partial<BodyLabels> | null; foreign?: boolean; children: ReactNode }) {
  return (
    <ForeignReadingContext.Provider value={foreign}>
      <BodyLabelsContext.Provider value={override}>{children}</BodyLabelsContext.Provider>
    </ForeignReadingContext.Provider>
  );
}

/** ko · en 밖의 언어로 읽는 중인가 — 이름은 기계로 음역하지 않고 영어 이름(name_en, 없으면 name)을 쓴다 */
export function useForeignReading(): boolean {
  return useContext(ForeignReadingContext);
}

/**
 * 본문 안 라벨 — 화면 언어 라벨에 번역을 덮은 것. 언어나 번역이 바뀔 때만 새 객체(그 밖엔 같은 객체)라
 * 메모 deps 에 넣어도 본문을 괜히 다시 세팅하지 않는다.
 * translated 는 번역 라벨이 걸렸는지 — 수식 오류처럼 화면 언어일 때와 다르게 다루는 곳이 쓴다.
 */
export function useBodyLabels(): { labels: BodyLabels; translated: boolean } {
  const { language } = useLanguage();
  const override = useContext(BodyLabelsContext);
  return useMemo(
    () => ({ labels: mergeBodyLabels(uiBodyLabels(language), override), translated: !!override }),
    [language, override],
  );
}

/**
 * 라벨 한 칸 — <T k> · <T ko en> 자리에 쓴다. 화면 언어로 볼 때는 <T ko en>(반대 언어 툴팁) 그대로,
 * 번역해 볼 때는 번역 라벨(반대 언어 툴팁은 뜻이 없어 뺀다). vars 는 {{n}} 같은 자리표시 값.
 * lang 을 주면 화면 언어 대신 그 언어(보는 언어 viewLang 을 따르던 자리 — 예전처럼 툴팁 없는 글).
 * tooltip 은 설명 말풍선(라벨 열쇠) — 번역해 볼 때도 번역 라벨로 띄운다.
 */
export function UiLabel({ name, vars, lang, tooltip, ...rest }: {
  name: BodyLabelKey;
  vars?: Record<string, string | number>;
  lang?: "ko" | "en";
  tooltip?: BodyLabelKey;
} & HTMLAttributes<HTMLSpanElement>) {
  const { labels, translated } = useBodyLabels();
  const fill = (s: string) => (vars ? fillLabel(s, vars) : s);
  if (translated) {
    const span = <span {...rest}>{fill(labels[name])}</span>;
    return tooltip ? <Tooltip content={labels[tooltip]} delay={600}>{span}</Tooltip> : span;
  }
  const pair = bodyLabelPair(name);
  if (lang) return <span {...rest}>{fill(pair[lang])}</span>;
  return <T ko={fill(pair.ko)} en={fill(pair.en)} tooltip={tooltip ? labels[tooltip] : undefined} {...rest} />;
}
