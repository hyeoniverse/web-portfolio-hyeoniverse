import { notifyAiFailures } from "@/lib/ai/notifyFailures";
import { useState, useCallback, useRef } from "react";
import { useSyncRef } from "@/hooks/useSyncRef";
import { autoTranslate } from "@/utils/autoTranslate";
import { errorText } from "@/lib/apiError";

interface TranslatableField {
  /** Logical name used for selective translation (e.g. "title", "content") */
  key: string;
  /** Form field key to read source text from */
  sourceKey: string;
  /** Form field key to write translated text to */
  targetKey: string;
}

type FieldMapperFn = (lang: "ko" | "en") => TranslatableField[];

interface UseEditorTranslationOptions {
  /** Current form state (read-only reference) */
  form: Record<string, unknown>;
  /** 상태 문구 번역 — 관리자 화면 언어(번역 대상 언어가 아니다) */
  t: (key: string) => string;
  /** i18n key prefix for status messages (e.g. "admin.posts.editor") */
  i18nPrefix: string;
  /** Returns field mappings for a given target language */
  fieldMapper: FieldMapperFn;
  /** All logical field keys (for "translate all" default) */
  allFieldKeys: string[];
  /** Callback to apply translated values to the form */
  onUpdate: (patch: Record<string, string>) => void;
  /** Callback for status messages */
  onStatus?: (msg: string, type: "info" | "success") => void;
  /** Callback for error messages */
  onError?: (msg: string) => void;
  /** 초기 편집 언어 — 콘텐츠 작성 기본 언어(siteConfig) 기준. 미지정 시 "ko" */
  initialLang?: "ko" | "en";
}

export function useEditorTranslation({
  form,
  t,
  i18nPrefix,
  fieldMapper,
  allFieldKeys,
  onUpdate,
  onStatus,
  onError,
  initialLang = "ko",
}: UseEditorTranslationOptions) {
  const [editorLang, setEditorLang] = useState<"ko" | "en">(initialLang);
  const [translating, setTranslating] = useState(false);

  // Keep a ref so callbacks don't go stale on `form`
  const formRef = useRef(form);
  useSyncRef(formRef, form);

  const translateFields = useCallback(
    async (fieldKeys: string[], lang: "ko" | "en") => {
      const isToEn = lang === "en";
      const sourceLang: "ko" | "en" = isToEn ? "ko" : "en";
      const targetLang: "ko" | "en" = isToEn ? "en" : "ko";
      const want = new Set(fieldKeys);

      const mappings = fieldMapper(lang);
      const active = mappings.filter(
        (m) => want.has(m.key) && String(formRef.current[m.sourceKey] ?? "").trim(),
      );
      const texts = active.map((m) => String(formRef.current[m.sourceKey]));

      if (texts.length === 0) return;

      setTranslating(true);
      onStatus?.(t(`${i18nPrefix}.translating`), "info");

      const result = await autoTranslate(texts, sourceLang, targetLang);
      setTranslating(false);

      const feature = t("admin.aiHealth.feature.translation");
      if ("translations" in result) {
        /* 번역이 비어 온 칸(failedIndices)은 건드리지 않는다 — 예전에는 빈 문자열로 덮어 그 언어의 글이 지워졌다 */
        const patch: Record<string, string> = {};
        active.forEach((m, i) => {
          if (!result.failedIndices.includes(i)) patch[m.targetKey] = result.translations[i];
        });
        onUpdate(patch);
        onStatus?.(t(`${i18nPrefix}.autoTranslated`), "success");
        notifyAiFailures(result, t, { feature, ok: true });
      } else {
        onError?.(errorText(result.error, t, t(`${i18nPrefix}.translateFailed`)));
        notifyAiFailures(result, t, { feature, ok: false });
      }
    },
    [fieldMapper, t, i18nPrefix, onUpdate, onStatus, onError],
  );

  const handleEditorLangChange = useCallback(
    async (newLang: "ko" | "en") => {
      if (translating) return;
      setEditorLang(newLang);

      const mappings = fieldMapper(newLang);
      const hasSrc = mappings.some((m) =>
        String(formRef.current[m.sourceKey] ?? "").trim(),
      );
      const hasDst = mappings.some((m) =>
        String(formRef.current[m.targetKey] ?? "").trim(),
      );

      if (hasSrc && !hasDst) {
        await translateFields(allFieldKeys, newLang);
      }
    },
    [translating, fieldMapper, allFieldKeys, translateFields],
  );

  const handleRetranslate = useCallback(
    async (fieldKeys?: string[]) => {
      if (translating) return;
      await translateFields(fieldKeys ?? allFieldKeys, editorLang);
    },
    [translating, editorLang, translateFields, allFieldKeys],
  );

  return {
    editorLang,
    setEditorLang,
    translating,
    translateFields,
    handleEditorLangChange,
    handleRetranslate,
  };
}
