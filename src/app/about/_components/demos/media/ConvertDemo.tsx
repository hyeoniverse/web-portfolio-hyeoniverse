"use client";

/* PDF · PPTX 를 장마다 그림으로 — 사이트 관리자에서 발표 파일을 올리면 갤러리 장과 대본이 되는 과정을 흉내 낸다(실제로 변환하지는 않는다).
   화면에 들어오면 한 번 돌고, 파일 종류를 바꾸거나 다시 누르면 처음부터. PPTX 는 발표자 노트가 대본이 된다.
   움직임 줄이기면 처음부터 다 그린 상태로 둔다 */
import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Button from "@/components/ui/Button";
import SegmentedControl from "@/components/ui/SegmentedControl";
import { FileText, RefreshCw } from "@/components/icons";
import { StarMark, useL } from "../../features/shared";
import { SLIDE_H, SLIDE_W, SLIDES, convertCopy as copy, fill } from "./data";
import { prefersReducedMotion, useInView } from "./useInView";
import styles from "./MediaDemos.module.css";

/** 변환 단계 — 읽기 → 장마다 그리기 → 올리기 → 끝 */
type Phase = "idle" | "read" | "draw" | "upload" | "done";
type Kind = "pptx" | "pdf";

/** 단계 시간표(ms) — 읽기, 한 장 그리기, 다 그린 뒤 올리기까지, 올리기 */
const READ_MS = 700;
const DRAW_MS = 360;
const UPLOAD_GAP_MS = 200;
const UPLOAD_MS = 800;

const TOTAL = SLIDES.length;
/** 대본이 될 발표자 노트가 있는 장 수 */
const NOTES = SLIDES.filter((item) => item.script || item.audio).length;
const KINDS = [
  { value: "pptx", label: "PPTX" },
  { value: "pdf", label: "PDF" },
] as const;

export default function ConvertDemo() {
  const L = useL();
  const [box, inView] = useInView<HTMLDivElement>(0.4);
  const [kind, setKind] = useState<Kind>("pptx");
  const [phase, setPhase] = useState<Phase>("idle");
  const [drawn, setDrawn] = useState(0);
  const timers = useRef<number[]>([]);
  const started = useRef(false);

  const clear = () => {
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current = [];
  };
  const start = useCallback(() => {
    clear();
    if (prefersReducedMotion()) {
      setDrawn(TOTAL);
      setPhase("done");
      return;
    }
    const later = (fn: () => void, at: number) => timers.current.push(window.setTimeout(fn, at));
    setDrawn(0);
    setPhase("read");
    later(() => setPhase("draw"), READ_MS);
    for (let i = 1; i <= TOTAL; i += 1) later(() => setDrawn(i), READ_MS + i * DRAW_MS);
    const drawnAt = READ_MS + TOTAL * DRAW_MS;
    later(() => setPhase("upload"), drawnAt + UPLOAD_GAP_MS);
    later(() => setPhase("done"), drawnAt + UPLOAD_GAP_MS + UPLOAD_MS);
  }, []);
  useEffect(() => clear, []);
  /* 처음 화면에 들어올 때 한 번 */
  useEffect(() => {
    if (!inView || started.current) return;
    started.current = true;
    const id = window.setTimeout(start, 0);
    return () => window.clearTimeout(id);
  }, [inView, start]);

  const label = {
    idle: L(copy.idle),
    read: L(copy.read),
    draw: fill(L(copy.draw), { n: drawn, total: TOTAL }),
    upload: L(copy.upload),
    done: fill(L(kind === "pptx" ? copy.doneNotes : copy.done), { total: TOTAL, notes: NOTES }),
  }[phase];
  const busy = phase !== "done" && phase !== "idle";

  return (
    <div ref={box} className={styles.tool}>
      <div className={styles.convertHead}>
        <div role="group" aria-label={L(copy.fileKind)}>
          <SegmentedControl
            items={KINDS}
            value={kind}
            size="xs"
            onChange={(value) => {
              setKind(value);
              start();
            }}
          />
        </div>
        <p className={styles.file}>
          <FileText size={16} aria-hidden />
          hyeoniverse-portfolio.{kind}
        </p>
        <Button
          variant="ghost"
          shape="circle"
          size="sm"
          aria-label={L(copy.again)}
          title={L(copy.again)}
          icon={<RefreshCw size={16} />}
          onClick={start}
        />
      </div>
      <p className={styles.status} role="status" data-phase={phase}>
        {busy && <i className={styles.spin} aria-hidden />}
        {phase === "done" && <StarMark className={styles.statusStar} />}
        {label}
      </p>
      <ol className={styles.grid}>
        {SLIDES.map((slide, i) => (
          <li key={slide.src} className={styles.cell} data-drawn={i < drawn || undefined}>
            <span className={styles.cellImg}>
              <Image src={slide.src} alt="" width={SLIDE_W} height={SLIDE_H} sizes="(width > 768px) 20vw, 33vw" />
            </span>
            {/* 아래 한 줄 — 파일 이름과, PPTX 면 대본이 된 노트(높이는 늘 같다) */}
            <span className={styles.cellCap}>
              <span>{String(i + 1).padStart(2, "0")}.jpg</span>
              {kind === "pptx" && i < drawn && (slide.script || slide.audio) && (
                <span className={styles.cellNote} role="img" aria-label={L(copy.note)}>
                  <StarMark className={styles.capStar} />
                  <span className={styles.cellNoteText}>{L(copy.note)}</span>
                </span>
              )}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
