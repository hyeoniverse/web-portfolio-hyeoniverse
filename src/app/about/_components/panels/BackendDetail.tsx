import type { Language } from "@/providers/LanguageProvider";
import type { BackendItem } from "@/data/about";
import { renderHighlight } from "../renderHighlight";
import CodeHighlight from "../CodeHighlight";
import T from "@/components/ui/T";
import entry from "../AboutEntry.module.css";
import frame from "../AboutPanel.module.css";
import local from "./BackendPanel.module.css";
const shared = { ...entry, ...frame };
const styles = { ...shared, ...local };

/** 공통: 항목 상세 렌더링 */
export function renderDetail(item: BackendItem, index: number, language: Language) {
  return (
    <>
      <div className={styles.detailHeader}>
        <span className={`${styles.detailNumber} ${styles.watermarkNumber}`}>
          {String(index + 1).padStart(2, "0")}
        </span>
        <h4 className={styles.dbTitle}>{item.name}</h4>
        <span className={`${styles.dbKindBadge} ${item.kind === "api" ? styles.dbKindApi : styles.dbKindTable}`}>
          {item.kind === "api" ? "API" : "TABLE"}
        </span>
      </div>

      {/* 설명 */}
      <div className={`${styles.entryBlock} ${styles.dbEntry}`}>
        <p>{item.description[language]}</p>
      </div>

      {/* API: 엔드포인트 목록 */}
      {item.kind === "api" && item.endpoints && (
        <div className={styles.entryBlock}>
          <span className={`${styles.entryLabel} ${styles.entryLabelAccent}`}>
            <T k="aboutPage.backend.endpoints" />
          </span>
          <div className={styles.dbEndpointList}>
            {item.endpoints.map((ep, ei) => (
              <div key={ei} className={styles.dbEndpoint}>
                <span className={`${styles.dbMethodBadge} ${styles[`dbMethod${ep.method}` as keyof typeof styles] || ""}`}>
                  {ep.method}
                </span>
                <span className={styles.dbEndpointPath}>{ep.path}</span>
                <span className={styles.dbEndpointDesc}>{ep.description[language]}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Table: 설계 노트 */}
      {item.kind === "table" && item.designNote && (
        <div className={`${styles.entryBlock} ${styles.dbEntry}`}>
          <span className={`${styles.entryLabel} ${styles.entryLabelAccent}`}>
            <T k="aboutPage.backend.designDecision" />
          </span>
          <p>{renderHighlight(item.designNote[language])}</p>
        </div>
      )}

      {/* Table: 스키마 */}
      {item.kind === "table" && item.columns && (
        <div className={styles.entryBlock}>
          <span className={styles.entryLabel}>
            <T k="aboutPage.backend.schema" />
          </span>
          <div className={styles.dbSchema}>
            <div className={styles.dbSchemaHeader}>
              <span><T k="aboutPage.backend.column" /></span>
              <span><T k="aboutPage.backend.type" /></span>
              <span><T k="aboutPage.backend.description" /></span>
            </div>
            {item.columns.map((col, ci) => (
              <div key={ci} className={styles.dbSchemaRow}>
                <span className={styles.dbColName}>
                  {col.name}
                  {col.constraint && (
                    <span className={styles.dbColConstraint}>
                      {col.constraint}
                    </span>
                  )}
                </span>
                <span className={styles.dbColType}>{col.type}</span>
                <span className={styles.dbColDesc}>
                  {col.description[language]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 예시 쿼리/코드 */}
      {item.exampleQuery && (
        <div className={styles.entryBlock}>
          <span className={`${styles.entryLabel} ${styles.entryLabelInsight}`}>
            {item.exampleQuery.title}
          </span>
          <div className={styles.dbQuery}>
            <CodeHighlight
              code={item.exampleQuery.code}
              language={item.exampleQuery.language}
            />
          </div>
        </div>
      )}
    </>
  );
}
