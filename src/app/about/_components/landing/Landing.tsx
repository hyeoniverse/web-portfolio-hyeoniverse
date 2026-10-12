"use client";

/* 제품 랜딩 조각 — 첫 화면 CTA, 핵심 세 가지, 신뢰, 자주 묻는 질문, 마지막 CTA. 글은 _data/landing.
   첫 화면 CTA 를 뺀 나머지는 프레지 프레임 하나씩 — 화면 하나에 맞추고, 긴 것은 프레임 안 단계(useFrameSteps)로 나눈다 */
import Button from "@/components/ui/Button";
import Pressable from "@/components/ui/Pressable";
import { useContactStore } from "@/stores/contactStore";
import { useL } from "../features/shared";
import { GuideAnchor } from "../guide/GuideStar";
import { useFrame, useFrameSteps } from "../prezi/context";
import styles from "./Landing.module.css";
import { useAboutText } from "../../_panels/AboutConfig";

/** 첫 화면 — 한 줄 가치 제안과 단추 둘 */
export function HeroCta() {
  const { heroCta } = useAboutText().landing;
  const L = useL();
  const openForm = useContactStore((s) => s.openForm);
  return (
    <div className={styles.heroCta}>
      <p className={styles.value}>{L(heroCta.value)}</p>
      <div className={styles.actions}>
        <Button href="/works" variant="primary" size="lg">{L(heroCta.primary)}</Button>
        <Button variant="outline" size="lg" onClick={openForm}>{L(heroCta.secondary)}</Button>
      </div>
    </div>
  );
}

/** 신뢰 — 점수판(숫자 셋)과 그 아래 근거. 단계마다 숫자 하나가 앞으로 나오고 근거가 바뀐다 */
export function Trust() {
  const { trust } = useAboutText().landing;
  const L = useL();
  const { step, setStep } = useFrameSteps(trust.items.length);
  return (
    <section id="trust" className={styles.trustScene} style={{ "--at": step } as React.CSSProperties}>
      <div className={styles.head}>
        <span className={styles.eyebrow}>{L(trust.eyebrow)}</span>
        <h2 className={styles.title}>{L(trust.title)}</h2>
      </div>
      <ol className={styles.board}>
        {trust.items.map((t, i) => (
          <li key={i} className={styles.boardItem} data-on={i === step || undefined}>
            <Pressable className={styles.boardBtn} aria-current={i === step || undefined} onClick={() => setStep(i)}>
              <span className={styles.trustLabel}>{L(t.label)}</span>
              <span className={styles.trustValue}>
                {t.value}
                <span className={styles.trustUnit}>{typeof t.unit === "string" ? t.unit : L(t.unit)}</span>
              </span>
            </Pressable>
          </li>
        ))}
      </ol>
      <div className={styles.proof}>
        {trust.items.map((t, i) => (
          <ul key={i} className={styles.trustPoints} data-state={i === step ? "on" : i < step ? "past" : "next"} aria-hidden={i !== step || undefined}>
            {t.points.map((p, j) => (
              <li key={j} style={{ "--i": j } as React.CSSProperties}>{L(p)}</li>
            ))}
          </ul>
        ))}
      </div>
    </section>
  );
}

/** 자주 묻는 질문 — 왼쪽 질문 목록, 오른쪽 답 하나. 단계마다 다음 질문으로(누르면 그 질문으로) */
export function Faq() {
  const { faq } = useAboutText().landing;
  const L = useL();
  const { step, setStep } = useFrameSteps(faq.items.length);
  const total = String(faq.items.length).padStart(2, "0");
  return (
    <section id="faq" className={styles.faqScene}>
      <div className={styles.faqSide}>
        <span className={styles.eyebrow}>{L(faq.eyebrow)}</span>
        <ol className={styles.faqList}>
          {faq.items.map((f, i) => (
            <li key={i} data-on={i === step || undefined}>
              <Pressable className={styles.faqQ} aria-current={i === step || undefined} onClick={() => setStep(i)}>
                <span className={styles.faqNo}>{String(i + 1).padStart(2, "0")}</span>
                <span>{L(f.q)}</span>
              </Pressable>
            </li>
          ))}
        </ol>
      </div>
      <div className={styles.faqStage} aria-live="polite">
        {faq.items.map((f, i) => (
          <article key={i} className={styles.faqA} data-state={i === step ? "on" : i < step ? "past" : "next"} aria-hidden={i !== step || undefined}>
            <span className={styles.faqCount}>
              {String(i + 1).padStart(2, "0")} / {total}
            </span>
            <h3 className={styles.faqAq}>{L(f.q)}</h3>
            <p className={styles.faqAa}>{L(f.a)}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

/** 마무리 — 한 화면 가운데에 길잡이 별 · 큰 제목 · 단추 셋. 이 프레임에 들어오면 차례로 떠오른다 */
export function FinalCta() {
  const { finalCta } = useAboutText().landing;
  const L = useL();
  const openForm = useContactStore((s) => s.openForm);
  const { current } = useFrame();
  return (
    <section className={styles.final} data-on={current || undefined}>
      <span className={styles.finalGuide} style={{ "--i": 0 } as React.CSSProperties}>
        <GuideAnchor size="clamp(4rem, 9vw, 8rem)" />
      </span>
      <h2 className={styles.finalTitle} style={{ "--i": 1 } as React.CSSProperties}>{L(finalCta.title)}</h2>
      <p className={styles.finalBody} style={{ "--i": 2 } as React.CSSProperties}>{L(finalCta.body)}</p>
      <div className={styles.actions} style={{ "--i": 3 } as React.CSSProperties}>
        <Button href="/works" variant="primary" size="lg">{L(finalCta.works)}</Button>
        <Button href="/posts" variant="outline" size="lg">{L(finalCta.posts)}</Button>
        <Button variant="ghost" size="lg" onClick={openForm}>{L(finalCta.contact)}</Button>
      </div>
    </section>
  );
}
