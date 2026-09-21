"use client";

import { motion } from "framer-motion";
import "katex/dist/katex.min.css";
import RelatedChips from "@/components/ui/RelatedChips/RelatedChips";
import AISummary from "@/components/ui/AISummary";
import T from "@/components/ui/T";
import styles from "./WorkArticleInfoGrid.module.css";
import type { WorkArticleViewProps } from "./workArticleTypes";


/* ────────────────────────────────────────────────────────────
 * WorkArticleInfoGrid — 헤더 아래 정보 그리드.
 * 연도 · 카테고리 · 역할 · 본인 기여 · 기술 노트 · 관련 글/시리즈.
 * 항목이 없으면 블록 자체를 렌더하지 않아 그리드가 비어 보이지 않는다.
 * ──────────────────────────────────────────────────────────── */
export default function WorkArticleInfoGrid({
  project,
  viewLang,
  relatedPosts,
  relatedSeries,
}: WorkArticleViewProps) {

  return (
    <>
      {/* ── Info grid ── */}
      <motion.div
        className={styles.infoGrid}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.6 }}
      >
        <div className={styles.infoBlock}>
          <span className={styles.infoLabel}>Year</span>
          <span className={styles.infoValue}>{project.year}</span>
        </div>
        {(() => {
          const catsKo = project.categories?.ko ?? (project.category.ko ? [project.category.ko] : []);
          const catsEn = project.categories?.en ?? (project.category.en ? [project.category.en] : []);
          if (catsKo.length === 0) return null;
          return (
            <div className={styles.infoBlock}>
              <span className={styles.infoLabel}><T k="workDetail.category" /></span>
              <span className={styles.infoValue}>
                <T
                  ko={catsKo.join(", ")}
                  en={catsKo.map((k, i) => catsEn[i] || k).join(", ")}
                />
              </span>
            </div>
          );
        })()}
        {/* Tech — 설명 있는 것 위에 한 줄씩 (chip + text), 없는 것 아래에 wrap 으로 한 묶음 */}
        {(() => {
          const withText: Array<{ tech: string; text: string }> = [];
          const plain: string[] = [];
          project.tech.forEach((tech) => {
            const note = project.tech_notes?.[tech];
            const text = note
              ? (viewLang === "en"
                  ? (note.en.trim() || note.ko.trim())
                  : (note.ko.trim() || note.en.trim()))
              : "";
            if (text) withText.push({ tech, text });
            else plain.push(tech);
          });
          return (
            <div className={`${styles.infoBlock} ${styles.infoBlockFull}`}>
              <span className={styles.infoLabel}><T k="workDetail.tech" /></span>
              <div className={styles.techSection}>
                {withText.length > 0 && (
                  <ul className={styles.techNotesList}>
                    {withText.map(({ tech, text }) => (
                      <li key={tech} className={styles.techNoteItem}>
                        <span className={styles.techNoteTag}>{tech}</span>
                        <span className={styles.techNoteText}>{text}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {plain.length > 0 && (
                  <div className={styles.techPlainGroup}>
                    {plain.map((tech) => (
                      <span key={tech} className={styles.techNoteTag}>{tech}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })()}
        {/* Role + Contributions 통합 — items 있는 role 은 grid col, 없는 role 은 · 으로 한 줄 */}
        {(() => {
          const ko = project.contributions?.ko ?? {};
          const en = project.contributions?.en ?? {};
          const enHas = Object.keys(en).length > 0;
          const koHas = Object.keys(ko).length > 0;
          const map = viewLang === "en" ? (enHas ? en : ko) : (koHas ? ko : en);
          const entries = Object.entries(map);
          const withItems = entries.filter(([, items]) => items.length > 0);
          const plainRoles = entries.filter(([, items]) => items.length === 0).map(([role]) => role);
          return (
            <div className={`${styles.infoBlock} ${styles.infoBlockFull}`}>
              <span className={styles.infoLabel}><T k="workDetail.role" /></span>
              <div className={styles.ownContribsWrap}>
                {entries.length === 0 ? (
                  // contributions 아예 없으면 project.role 단독 표시
                  <div className={styles.ownContribsPlain}>
                    <span className={styles.ownContribsRoleChip}>
                      <T ko={project.role.ko} en={project.role.en} />
                    </span>
                  </div>
                ) : (
                  <>
                    {withItems.length > 0 && (
                      <div className={styles.ownContribsGrid}>
                        {withItems.map(([role, items]) => (
                          <div key={role} className={styles.teamContribsGroup}>
                            <div className={styles.teamContribsRoleLabel}>{role}</div>
                            <ul className={styles.teamContribs}>
                              {items.map((c, ci) => (
                                <li key={ci}>{c}</li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    )}
                    {plainRoles.length > 0 && (
                      <div className={styles.ownContribsPlain}>
                        {plainRoles.map((role, i) => (
                          <span key={role} className={styles.ownContribsRoleChip}>
                            {i > 0 && <span className={styles.ownContribsSep} aria-hidden> · </span>}
                            {role}
                          </span>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })()}

        {/* 관련 글 — info grid 안 full-width 칩 (공용 RelatedChips: wrap·더보기·hover 미리보기) */}
        {relatedPosts && relatedPosts.length > 0 && (
          <div className={`${styles.infoBlock} ${styles.infoBlockFull}`}>
            <span className={styles.infoLabel}>{viewLang === "en" ? "Related Posts" : "관련 글"}</span>
            <RelatedChips
              items={relatedPosts.map((p) => ({
                id: p.id,
                title: viewLang === "en" && p.title_en ? p.title_en : p.title,
                href: `/posts/${p.slug}`,
                image: p.cover_image || undefined,
                category: p.category || undefined,
                desc: p.excerpt || undefined,
              }))}
              moreLabel={viewLang === "en" ? "more" : "더보기"}
              lessLabel={viewLang === "en" ? "Show less" : "접기"}
            />
          </div>
        )}

        {/* 관련 시리즈 — info grid 안 칩 */}
        {relatedSeries && relatedSeries.length > 0 && (
          <div className={`${styles.infoBlock} ${styles.infoBlockFull}`}>
            <span className={styles.infoLabel}>{viewLang === "en" ? "Related Series" : "관련 시리즈"}</span>
            <RelatedChips
              items={relatedSeries.map((s) => ({
                id: s.id,
                title: viewLang === "en" && s.title_en ? s.title_en : s.title,
                href: `/posts?series=${s.id}`,
                image: s.cover_image || undefined,
                category: s.category || undefined,
                desc: (viewLang === "en" ? (s.description_en || s.description) : s.description) || undefined,
              }))}
              moreLabel={viewLang === "en" ? "more" : "더보기"}
              lessLabel={viewLang === "en" ? "Show less" : "접기"}
            />
          </div>
        )}
      </motion.div>

      {/* 번역 안내는 상세 화면이 본문 위에 낸다(TranslateBanner — 자동 번역 단추 포함) */}
      <AISummary
        summaryKo={project.summary?.ko ?? ""}
        summaryEn={project.summary?.en ?? ""}
        lang={viewLang}
      />
    </>
  );
}
