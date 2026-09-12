"use client";

import { useCallback } from "react";
import { useModalStore } from "@/stores/modalStore";
import { useLanguage } from "@/providers/LanguageProvider";
import { POST_TEMPLATES, type PostTemplate } from "@/data/postTemplates";
import { mdToRichHtml } from "../mdToRichHtml";
import Pressable from "@/components/ui/Pressable";
import { ModalConfirm } from "@/components/ui/ModalTemplates";
import type { PostFormData } from "@/types/post";
import styles from "../PostEditor.module.css";

/* 템플릿 삽입 — 목록을 모달로 띄우고, 고른 템플릿의 마크다운을 richtext 로 바꿔 넣는다.
   본문이 이미 있으면 <hr /> 로 구분해 뒤에 붙인다. 에디터는 richtext 단일이라 변환이 필요하다. */
export function useTemplateInsert({
  editorLang,
  form,
  updateField,
  te,
}: {
  editorLang: "ko" | "en";
  form: PostFormData;
  updateField: <K extends keyof PostFormData>(key: K, value: PostFormData[K]) => void;
  te: (key: string) => string;
}) {
  const { openModal, closeAll } = useModalStore();
  const { language } = useLanguage();

  const handleInsertTemplate = useCallback(() => {
    const lang = editorLang;
    const key = lang === "ko" ? "content" : "content_en";
    const current = form[key as keyof PostFormData] as string;

    const applyTemplate = (tmpl: PostTemplate) => {
      const md = lang === "ko" ? tmpl.content.ko : tmpl.content.en;
      // 에디터는 richtext 단일 — 템플릿 md 를 richtext 로 변환해 삽입
      const content = mdToRichHtml(md);

      if (current.trim()) {
        updateField(key as keyof PostFormData, current + "<hr />" + content);
      } else {
        updateField(key as keyof PostFormData, content);
      }
    };

    openModal(
      <div className={styles.templateModal}>
        <p className={styles.templateModalDesc}>{te("templateDesc")}</p>
        <div className={styles.templateList}>
          {POST_TEMPLATES.map((tmpl) => (
            <Pressable
              key={tmpl.id}
              className={styles.templateItem}
              onClick={() => {
                if (current.trim()) {
                  openModal(
                    <ModalConfirm
                      desc={te("templateConfirm")}
                      confirmText={te("insertTemplate")}
                      onConfirm={() => { applyTemplate(tmpl); closeAll(); }}
                    />,
                    { header: { title: te("insertTemplate") }, closeButton: true, width: "360px" },
                  );
                } else {
                  applyTemplate(tmpl);
                  closeAll();
                }
              }}
            >
              {/* 템플릿 이름·설명은 고르는 단추라 화면 언어로, 넣는 본문만 편집 중인 언어로 */}
              <span className={styles.templateItemLabel}>{language === "ko" ? tmpl.label.ko : tmpl.label.en}</span>
              <span className={styles.templateItemDesc}>{language === "ko" ? tmpl.desc.ko : tmpl.desc.en}</span>
            </Pressable>
          ))}
        </div>
      </div>,
      { header: { title: te("insertTemplate") }, closeButton: true, width: "420px" },
    );
  }, [editorLang, language, form, updateField, te, openModal, closeAll]);

  return handleInsertTemplate;
}
