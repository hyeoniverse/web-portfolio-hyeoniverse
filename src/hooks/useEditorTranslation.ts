import { useState, useCallback, useRef } from "react";
import { autoTranslate } from "@/utils/autoTranslate";

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
  /** i18n function scoped to the editor */
  tLang: (key: string, lang: "ko" | "en") => string;
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
  tLang,
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
  formRef.current = form;

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
      onStatus?.(tLang(`${i18nPrefix}.translating`, lang), "info");

      const result = await autoTranslate(texts, sourceLang, targetLang);
      setTranslating(false);

      if ("translations" in result) {
        const patch: Record<string, string> = {};
        active.forEach((m, i) => {
          patch[m.targetKey] = result.translations[i];
        });
        onUpdate(patch);
        onStatus?.(tLang(`${i18nPrefix}.autoTranslated`, lang), "success");
      } else {
        onError?.(result.error);
      }
    },
    [fieldMapper, tLang, i18nPrefix, onUpdate, onStatus, onError],
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
