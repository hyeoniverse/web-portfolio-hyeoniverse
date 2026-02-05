import { thisYear } from "@/utils";
import styles from "./Interview.module.css";
import { config } from "@/config";

export default function Interview() {
  const questions = config.interview.questions;

  return (
    <div className={styles.interview}>
      {/* Editorial Header */}
      <div className={styles.editorialHeader}>
        <div className={styles.headerLayout}>
          <div className={styles.titleSection}>
            <h2 className={styles.interviewTitle}>
              Personal
              <span className={styles.titleAccent}>Interview</span>
            </h2>
          </div>
          <div className={styles.metaSection}>
            <div className={styles.interviewSubtitle}>
              개발자로서의 철학과 가치관
            </div>
            <div className={styles.publishInfo}>
              <span className={styles.publishDate}>{thisYear} EDITION</span>
              <span className={styles.pageNumber}># 01-04</span>
            </div>
          </div>
        </div>
      </div>

      {/* Editorial Grid Layout */}
      <div className={styles.editorialGrid}>
        {/* Left Column - Q1 & Q3 */}
        <div className={styles.leftColumn}>
          {[questions[0], questions[2]].map((q, idx) => (
            <article
              key={q.number}
              className={`${styles.card} ${idx === 0 ? styles.cardLarge : styles.cardMedium}`}
            >
              <div className={styles.cardHeader}>
                <div className={styles.questionMeta}>
                  <span className={styles.questionNumber}>{q.number}</span>
                  <div className={styles.questionInfo}>
                    <span className={styles.cardCategory}>{q.category}</span>
                    <span className={styles.cardDate}>{thisYear}</span>
                  </div>
                </div>
              </div>
              <div className={styles.cardContent}>
                <h3 className={styles.cardTitle}>{q.title}</h3>
                <div className={styles.cardText}>
                  {q.paragraphs.map((p, pIdx) => (
                    <p
                      key={pIdx}
                      className={
                        p.isLead
                          ? styles.leadParagraph
                          : p.isHighlight
                            ? styles.highlightParagraph
                            : undefined
                      }
                      dangerouslySetInnerHTML={{ __html: p.text }}
                    />
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* Right Column - Q2 & Q4 */}
        <div className={styles.rightColumn}>
          {[questions[1], questions[3]].map((q, idx) => (
            <article
              key={q.number}
              className={`${styles.card} ${idx === 0 ? styles.cardMedium : styles.cardLarge}`}
            >
              <div className={styles.cardHeader}>
                <div className={styles.questionMeta}>
                  <span className={styles.questionNumber}>{q.number}</span>
                  <div className={styles.questionInfo}>
                    <span className={styles.cardCategory}>{q.category}</span>
                    <span className={styles.cardDate}>{thisYear}</span>
                  </div>
                </div>
              </div>
              <div className={styles.cardContent}>
                <h3 className={styles.cardTitle}>{q.title}</h3>
                <div className={styles.cardText}>
                  {q.paragraphs.map((p, pIdx) => (
                    <p
                      key={pIdx}
                      className={
                        p.isLead
                          ? styles.leadParagraph
                          : p.isHighlight
                            ? styles.highlightParagraph
                            : undefined
                      }
                      dangerouslySetInnerHTML={{ __html: p.text }}
                    />
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      {/* Editorial Footer */}
      <div className={styles.editorialFooter}>
        <div className={styles.footerLine}></div>
        <div className={styles.footerText}>
          <span>DEVELOPER INTERVIEW SERIES</span>
          <span>CONTINUED ON NEXT PROJECT</span>
        </div>
      </div>
    </div>
  );
}
