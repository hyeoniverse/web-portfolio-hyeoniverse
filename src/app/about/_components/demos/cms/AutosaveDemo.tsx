"use client";

/* 세 겹 자동 저장과 버전 확인 — 글을 고치면 브라우저 저장이 바로 켜지고, 3초 손을 떼면 10자 이상 바뀌었을 때만
   서버 수정본이 쌓이고, 떠날 때는 마지막 변경을 보낸다. 저장은 열 때 받은 버전과 서버 버전이 같을 때만(409).
   대본: 한 문장을 이어 쓰고 → 3초 뒤 수정본이 쌓이고 → 다른 탭이 먼저 저장한 뒤 저장하면 409 */
import { useEffect, useReducer, useRef, useState } from "react";
import Button from "@/components/ui/Button";
import Textarea from "@/components/ui/Textarea";
import { STAR_PATH, useL } from "../../features/shared";
import { GuideAnchor } from "../../guide/GuideStar";
import { autosave as copy, AUTOSAVE_IDLE_MS, AUTOSAVE_MIN_CHAR_DIFF, AUTOSAVE_MAX_REVISIONS } from "./data";
import { DemoShell, useScript, type Cue } from "./Script";
import styles from "./CmsDemos.module.css";

type Lane = "local" | "server" | "beacon";
const LANES: Lane[] = ["local", "server", "beacon"];

/** 대본이 이어 쓰는 말 — 10자가 넘어 수정본이 쌓인다 */
const TYPED = { ko: " 멈추면 3초 뒤 서버로 갑니다.", en: " Pause and it goes to the server in 3 s." };
/** 대본의 한 글자 간격 */
const KEY_MS = 55;

/** 앞뒤로 같은 부분을 걷어 낸 가운데 길이 — hooks/useEditorAutoSave 의 변화량 계산과 같다 */
function changedChars(a: string, b: string) {
  const min = Math.min(a.length, b.length);
  let p = 0;
  while (p < min && a[p] === b[p]) p++;
  let s = 0;
  while (s < min - p && a[a.length - 1 - s] === b[b.length - 1 - s]) s++;
  return Math.max(a.length, b.length) - p - s;
}

type Note = "saved" | "skipped" | "beacon" | "nothing" | null;

/* 버전 확인 — 열 때 받은 버전과 서버 버전. 대본도 같은 규칙을 거치도록 reducer 로 둔다 */
type Ver = { opened: number; server: number; result: "ok" | "conflict" | "reloaded" | null };
type VerAction = "save" | "other" | "overwrite" | "reload" | "clear";
function verReducer(v: Ver, action: VerAction): Ver {
  switch (action) {
    case "save":
      return v.opened !== v.server ? { ...v, result: "conflict" } : { opened: v.server + 1, server: v.server + 1, result: "ok" };
    /* 충돌 창의 두 갈래 — 최신 버전 번호로 다시 보내 덮어쓰거나, 최신을 다시 불러온다 */
    case "overwrite":
      return { opened: v.server + 1, server: v.server + 1, result: "ok" };
    case "reload":
      return { ...v, opened: v.server, result: "reloaded" };
    case "other":
      return { ...v, server: v.server + 1, result: null };
    case "clear":
      return v.result ? { ...v, result: null } : v;
  }
}

export default function AutosaveDemo() {
  const t = useL();
  /* 고치기 전에는 화면 언어의 첫 문장을 보여 준다 — 서버와 클라이언트의 언어가 달라도 hydration 이 어긋나지 않게 */
  const [edited, setEdited] = useState<string | null>(null);
  const initial = t(copy.initial);
  const text = edited ?? initial;
  const [flash, setFlash] = useState<Record<Lane, number>>({ local: 0, server: 0, beacon: 0 });
  const [waiting, setWaiting] = useState(false);
  const [revisions, setRevisions] = useState(3);
  const [note, setNote] = useState<Note>(null);
  const [ver, dispatchVer] = useReducer(verReducer, { opened: 7, server: 7, result: null });
  /* 지금 보여 주는 구역 — 1 쓰는 동안의 세 저장 길, 2 두 탭의 저장 충돌. 다른 구역은 옅게 */
  const [focus, setFocus] = useState<1 | 2>(1);
  const dispatch = (a: Parameters<typeof dispatchVer>[0]) => {
    if (a !== "clear") setFocus(2);
    dispatchVer(a);
  };
  /* 마지막 수정본의 내용 — 타이머가 돌 때의 최신 값을 읽어야 해서 ref */
  const baseline = useRef<string | null>(null);
  const latest = useRef<string | null>(null);
  const idle = useRef(0);
  useEffect(() => () => window.clearTimeout(idle.current), []);
  /* 길잡이 별이 가리킬 저장 길 — 마지막으로 저장된 길 */
  const [lastLane, setLastLane] = useState<Lane>("local");
  const light = (lane: Lane) => {
    setLastLane(lane);
    setFlash((now) => ({ ...now, [lane]: now[lane] + 1 }));
  };
  const base = () => baseline.current ?? initial;
  const current = () => latest.current ?? initial;
  const addRevision = (value: string) => {
    baseline.current = value;
    setRevisions((n) => Math.min(AUTOSAVE_MAX_REVISIONS, n + 1));
    light("server");
  };

  const type = (value: string) => {
    setFocus(1);
    setEdited(value);
    latest.current = value;
    dispatch("clear");
    setNote(null);
    light("local");
    setWaiting(true);
    window.clearTimeout(idle.current);
    idle.current = window.setTimeout(() => {
      setWaiting(false);
      const now = current();
      if (changedChars(base(), now) >= AUTOSAVE_MIN_CHAR_DIFF) {
        addRevision(now);
        setNote("saved");
      } else {
        setNote("skipped");
      }
    }, AUTOSAVE_IDLE_MS);
  };

  /* 떠날 때는 변화량 기준 없이 바뀐 것이 있으면 보낸다 */
  const leave = () => {
    setFocus(1);
    window.clearTimeout(idle.current);
    setWaiting(false);
    light("beacon");
    if (current() !== base()) {
      addRevision(current());
      setNote("beacon");
    } else {
      setNote("nothing");
    }
  };

  /* 대본이 누른 단추 — 잠깐 강조 */
  const [pressing, setPressing] = useState<"other" | "save" | null>(null);
  const pressTimer = useRef(0);
  useEffect(() => () => window.clearTimeout(pressTimer.current), []);
  const press = (a: "other" | "save") => {
    setPressing(a);
    dispatch(a);
    window.clearTimeout(pressTimer.current);
    pressTimer.current = window.setTimeout(() => setPressing(null), 900);
  };

  const script = useScript(() => {
    const extra = t(TYPED);
    const cues: Cue[] = [];
    for (let i = 1; i <= extra.length; i++) cues.push([i === 1 ? 700 : KEY_MS, () => type(initial + extra.slice(0, i))]);
    /* 저장 충돌 — 누른 단추가 잠깐 눌린 것처럼 빛나 무엇을 했는지 보이게 */
    cues.push([AUTOSAVE_IDLE_MS + 900, () => press("other")], [1400, () => press("save")]);
    return cues;
  });

  const noteText =
    note === "saved" ? copy.serverSaved : note === "skipped" ? copy.serverSkipped : note === "beacon" ? copy.beaconSent : note === "nothing" ? copy.beaconNothing : null;

  return (
    <DemoShell {...script}>
      <section className={styles.focusArea} data-on={focus === 1 || undefined}>
      <p className={styles.focusHead}><span className={styles.focusNo}>1</span>{t(copy.sectionWrite)}</p>
      <Textarea label={t(copy.editor)} value={text} rows={2} onChange={type} />
      <ol className={styles.lanes}>
        {LANES.map((lane) => {
          const info = copy.lanes[lane];
          return (
            <li key={lane} data-waiting={(lane === "server" && waiting) || undefined}>
              {/* 저장 길 하나 = 별 하나. 그 길로 저장되면 별이 반짝인다 */}
              <svg
                className={styles.laneStar}
                key={flash[lane]}
                data-flash={flash[lane] > 0 || undefined}
                /* 지금 볼 곳 — 길잡이 별이 이 별로 날아와 앉는다 */
                data-guide={focus === 1 && lane === lastLane ? "" : undefined}
                data-guide-priority={focus === 1 && lane === lastLane ? 2 : undefined}
                viewBox="0 0 100 100"
                aria-hidden="true"
              >
                <path d={STAR_PATH} />
              </svg>
              <span className={styles.laneWhen}>{t(info.when)}</span>
              <span className={styles.laneBox}>
                <strong>{t(info.what)}</strong>
                <small>
                  {lane === "server" ? `${revisions}${t(copy.count)} / ${AUTOSAVE_MAX_REVISIONS} · ${t(info.note)}` : t(info.note)}
                </small>
                {lane === "server" && <i className={styles.laneTimer} aria-hidden="true" key={text} />}
              </span>
            </li>
          );
        })}
      </ol>
      <p className={styles.result} role="status">
        {noteText ? t(noteText) : waiting ? t(copy.waiting) : " "}
      </p>
      </section>
      {/* 저장 충돌 — 판 없이 점선 한 줄로 나눈다 */}
      <section className={`${styles.conflict} ${styles.focusArea}`} data-on={focus === 2 || undefined}>
        <p className={styles.focusHead}><span className={styles.focusNo}>2</span>{t(copy.sectionConflict)}</p>
        <p className={styles.versions}>
          {focus === 2 && <GuideAnchor size="1rem" priority={2} />}
          <span>
            {t(copy.opened)} <b>v{ver.opened}</b>
          </span>
          <span data-ahead={ver.server !== ver.opened || undefined}>
            {t(copy.server)} <b>v{ver.server}</b>
          </span>
        </p>
        <div className={styles.row}>
          <Button size="sm" variant="outline" className={styles.cueBtn} data-cue={pressing === "other" || undefined} onClick={() => dispatch("other")}>
            {t(copy.otherSave)}
          </Button>
          <Button size="sm" className={styles.cueBtn} data-cue={pressing === "save" || undefined} onClick={() => dispatch("save")}>
            {t(copy.save)}
          </Button>
          <Button size="sm" variant="ghost" onClick={leave}>
            {t(copy.leave)}
          </Button>
        </div>
        <div className={styles.row} data-reserve="">
          {ver.result === "conflict" && (
            <>
              <Button size="sm" variant="outline" tone="danger" onClick={() => dispatch("overwrite")}>
                {t(copy.overwrite)}
              </Button>
              <Button size="sm" variant="outline" onClick={() => dispatch("reload")}>
                {t(copy.reload)}
              </Button>
            </>
          )}
        </div>
        <p className={styles.result} data-kind={ver.result === "ok" ? "ok" : ver.result === "conflict" ? "error" : undefined} role="status">
          {ver.result === "ok"
            ? `${t(copy.ok)} v${ver.opened}`
            : ver.result === "conflict"
              ? t(copy.conflict)
              : ver.result === "reloaded"
                ? t(copy.reloaded)
                : " "}
        </p>
      </section>
    </DemoShell>
  );
}
