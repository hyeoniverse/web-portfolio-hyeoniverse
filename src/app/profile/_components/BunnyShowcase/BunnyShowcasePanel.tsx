"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/providers/LanguageProvider";
import { useProfileSectionStore } from "@/stores/profileSectionStore";
import styles from "./BunnyShowcase.module.css";

type Expression = "normal" | "surprised" | "happy";

const BUNNY_SECTION = 1;

interface Props {
  animateClass?: string;
}

export default function BunnyShowcasePanel({ animateClass }: Props) {
  const { t } = useLanguage();
  const activeSection = useProfileSectionStore((s) => s.activeSection);
  const setBunnyExpression = useProfileSectionStore(
    (s) => s.setBunnyExpression,
  );
  const [expression, setExpression] = useState<Expression>("normal");

  const ac = animateClass ?? "";

  useEffect(() => {
    if (activeSection !== BUNNY_SECTION) {
      setBunnyExpression(null);
      setExpression("normal");
    }
  }, [activeSection, setBunnyExpression]);

  const handleExpression = (expr: Expression) => {
    setExpression(expr);
    setBunnyExpression(expr);
  };

  const expressions: { key: Expression; label: string; icon: string }[] = [
    { key: "normal", label: t("bunny.exprNormal"), icon: "‿‿" },
    { key: "surprised", label: t("bunny.exprSurprised"), icon: "><" },
    { key: "happy", label: t("bunny.exprHappy"), icon: "^^" },
  ];

  return (
    <div className={styles.layout}>
      <div className={`${styles.info} ${ac}`}>
        <span className={styles.nameLabel}>MEET</span>
        <h3 className={styles.name}>{t("bunny.name")}</h3>
        <span className={styles.subtitle}>{t("bunny.subtitle")}</span>

        <div className={styles.storyBlock}>
          <p className={styles.storyText}>{t("bunny.story1")}</p>
          <p className={styles.storyText}>{t("bunny.story2")}</p>
          <p className={styles.storyText}>{t("bunny.story3")}</p>
        </div>

        <div className={styles.exprBar}>
          {expressions.map(({ key, label, icon }) => (
            <button
              key={key}
              className={`${styles.exprBtn} ${expression === key ? styles.exprBtnActive : ""}`}
              onClick={() => handleExpression(key)}
            >
              <span className={styles.exprIcon}>{icon}</span>
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
