"use client";

import React, { useCallback } from "react";
import { CAPTION_EDIT_EVENT } from "../constants";
import FloatingBar from "./FloatingBar";
import { RxReset } from "react-icons/rx";
import { Trash2, AlignCenter, Scaling, Type, Play } from "lucide-react";
import { useLanguage } from "@/providers/LanguageProvider";
import TBtn from "../TBtn";
import Popover from "@/components/ui/Popover";
import NumberInput from "@/components/ui/NumberInput";
import { LockIcon, UnlockIcon } from "../icons";
import styles from "../../RichTextEditor.module.css";

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  editor: any;
  visible: boolean;
  selectedMedia: { node: Record<string, unknown>; path: number[] } | null;
}

const ALIGN_ICONS: Record<string, string> = { left: "◧", center: "◻", right: "◨" };
const SIZES = [{ label: "S", w: 400 }, { label: "M", w: 560 }, { label: "L", w: 720 }, { label: "Full", w: 0 }];
// 동영상 W/H 직접입력 상·하한 (px) — 퇴화값·비상식 값 방지
const VID_MIN_PX = 40;
const VID_MAX_PX = 4096;

/**
 * 미디어(동영상 / YouTube·임베드) 공통 floating 툴바 — 이미지·표 툴바와 동일하게
 * 최상위에서 렌더되고 선택된 media_embed 에 앵커된다. (예전 도킹형 .contextToolbar 대체)
 */
export default React.memo(function VideoToolbar({ editor, visible, selectedMedia }: Props) {
  const { t, language } = useLanguage();
  const L = (ko: string, en: string) => (language === "en" ? en : ko);

  // 앵커 — 실제 <video>/<iframe> 박스 (figure/wrapper 가 아닌 미디어 자체 기준)
  const getRect = useCallback((): DOMRect => {
    try {
      const dom = selectedMedia ? editor.api.toDOMNode(selectedMedia.node) : null;
      const media = (dom as HTMLElement | null)?.querySelector("video, iframe");
      return ((media || dom) as HTMLElement | null)?.getBoundingClientRect() ?? new DOMRect();
    } catch { return new DOMRect(); }
  }, [editor, selectedMedia]);

  const setAttr = useCallback((attrs: Record<string, unknown>) => {
    try { if (selectedMedia) editor.tf.setNodes(attrs, { at: selectedMedia.path }); } catch { /* ignore */ }
  }, [editor, selectedMedia]);

  const deleteMedia = useCallback(() => {
    try { if (selectedMedia) editor.tf.removeNodes({ at: selectedMedia.path }); } catch { /* ignore */ }
  }, [editor, selectedMedia]);

  if (!visible || !selectedMedia) return null;

  const node = selectedMedia.node;
  const url = (node.url as string) || "";
  const isYT = /youtube\.com\/embed\/|youtube\.com\/watch|youtu\.be/.test(url);
  const isVideo = node.mediaType === "video" || /\.(mp4|webm|ogg|mov|m4v)(\?|#|$)/i.test(url);
  const align = (node.align as string) || "center";
  const width = (node.width as number) || 0;
  const height = (node.height as number) || 0;
  const layout = (node.layout as string) || "block";
  const isFloat = layout.startsWith("float-");
  const lock = (node.lockAspect as boolean) ?? true;
  // 재생 옵션 + 캡션 + 다운로드 방지 (업로드 동영상)
  const vidAutoplay = (node.vidAutoplay as boolean) || false;
  const vidLoop = (node.vidLoop as boolean) || false;
  const vidMuted = (node.vidMuted as boolean) || false;
  const vidStart = (node.vidStart as number) || 0;
  // 시작 시점 h·m·s 분할 입력
  const vsH = Math.floor(vidStart / 3600);
  const vsM = Math.floor((vidStart % 3600) / 60);
  const vsS = vidStart % 60;
  const setVidTime = (type: "h" | "m" | "s", v: number) => {
    const n = Math.max(0, v || 0);
    let next = type === "h" ? Math.min(23, n) * 3600 + vsM * 60 + vsS
      : type === "m" ? vsH * 3600 + Math.min(59, n) * 60 + vsS
      : vsH * 3600 + vsM * 60 + Math.min(59, n);
    // 동영상 길이 밖 값 방지 — 실제 duration(초)으로 clamp
    try {
      const dom = editor.api.toDOMNode(selectedMedia.node) as HTMLElement | null;
      const vid = dom?.querySelector("video");
      if (vid && isFinite(vid.duration) && vid.duration > 0) next = Math.min(next, Math.floor(vid.duration));
    } catch { /* ignore */ }
    setAttr({ vidStart: next });
  };
  const noDownload = (node.noDownload as boolean) || false;
  const hasCaption = !!((node.caption as string) || "").trim();
  const focusCaption = () => {
    try {
      const dom = editor.api.toDOMNode(selectedMedia.node) as HTMLElement | null;
      dom?.dispatchEvent(new CustomEvent(CAPTION_EDIT_EVENT.video, { bubbles: true }));
    } catch { /* ignore */ }
  };

  // 직접입력용 현재 크기 — 명시값이 없으면 실제 렌더된 <video> 크기를 초기값으로
  const domSize = (() => {
    try {
      const dom = editor.api.toDOMNode(selectedMedia.node) as HTMLElement | null;
      const v = dom?.querySelector("video");
      if (v) { const r = v.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; }
    } catch { /* ignore */ }
    return { w: 0, h: 0 };
  })();
  const wVal = width || domSize.w;
  const hVal = height || domSize.h;
  const ratio = wVal > 0 && hVal > 0 ? wVal / hVal : 0;
  const commitW = (nw: number) => setAttr(lock && ratio > 0 ? { width: nw, height: Math.round(nw / ratio) } : { width: nw });
  const commitH = (nh: number) => setAttr(lock && ratio > 0 ? { height: nh, width: Math.round(nh * ratio) } : { height: nh });
  const VID_SIZES = [{ label: "S", w: 320 }, { label: "M", w: 480 }, { label: "L", w: 640 }];
  // Full — 컨테이너(본문) 너비를 측정해 그 폭으로 채움 (높이는 비율 자동)
  const setFull = () => {
    try {
      const dom = editor.api.toDOMNode(selectedMedia.node) as HTMLElement | null;
      const cw = Math.round(dom?.getBoundingClientRect().width ?? 0);
      setAttr(cw > 0 ? { width: cw, height: 0 } : { width: 0, height: 0 });
    } catch { setAttr({ width: 0, height: 0 }); }
  };

  // YouTube 옵션
  const ytStart = (node.ytStart as number) || 0;
  const ytAutoplay = (node.ytAutoplay as boolean) || false;
  const ytLoop = (node.ytLoop as boolean) || false;
  const ytMute = (node.ytMute as boolean) || false;
  const hh = Math.floor(ytStart / 3600);
  const mm = Math.floor((ytStart % 3600) / 60);
  const ss = ytStart % 60;
  const setTime = (type: "h" | "m" | "s", v: number) => {
    const n = Math.max(0, v || 0);
    const next = type === "h" ? n * 3600 + mm * 60 + ss
      : type === "m" ? hh * 3600 + Math.min(59, n) * 60 + ss
      : hh * 3600 + mm * 60 + Math.min(59, n);
    setAttr({ ytStart: next });
  };

  // 현재 대상 미디어의 인스턴스 식별자(path) — 미디어 툴바가 열린 채 다른 동영상/임베드로
  // 옮겨가면 값이 바뀌어 FloatingBar 의 pin/오프셋이 리셋되고 새 대상에 재앵커된다.
  const anchorKey = selectedMedia.path.join(",");

  return (
    <FloatingBar open={visible} getAnchorRect={getRect} inline anchorKey={anchorKey}>
      {isVideo ? (
        <>
          {/* 배치·정렬 popover */}
          <Popover openOnHover placement="bottom-start" offset={8}
            trigger={<TBtn tooltip={L("배치·정렬", "Layout & align")}><span className={styles.tblBarLabel}><AlignCenter size={15} strokeWidth={1.75} />{L("배치", "Layout")}</span></TBtn>}>
            {() => (
              <div className={styles.tableMenu} onMouseDown={(e) => e.preventDefault()}>
                <div className={styles.tableGroup}>
                  <span className={styles.tableGroupLabel}>{L("배치", "Layout")}</span>
                  <TBtn active={!isFloat} onClick={() => setAttr({ layout: "block" })} tooltip={L("본문 폭 블록으로 배치", "Block layout")}>Block</TBtn>
                  <TBtn active={isFloat} onClick={() => { if (!isFloat) setAttr({ layout: "float-left" }); }} tooltip={L("본문 옆에 띄워 배치", "Float beside text")}>Float</TBtn>
                </div>
                <div className={styles.tableGroup}>
                  <span className={styles.tableGroupLabel}>{L("정렬", "Align")}</span>
                  {isFloat ? (
                    <>
                      <TBtn square active={layout === "float-left"} onClick={() => setAttr({ layout: "float-left" })} tooltip={t("editor.left")}>{ALIGN_ICONS.left}</TBtn>
                      <TBtn square active={layout === "float-right"} onClick={() => setAttr({ layout: "float-right" })} tooltip={t("editor.right")}>{ALIGN_ICONS.right}</TBtn>
                    </>
                  ) : (
                    (["left", "center", "right"] as const).map((a) => (
                      <TBtn key={a} square active={align === a} onClick={() => setAttr({ align: a })}
                        tooltip={a === "left" ? t("editor.left") : a === "center" ? t("editor.center") : t("editor.right")}>
                        {ALIGN_ICONS[a]}
                      </TBtn>
                    ))
                  )}
                </div>
              </div>
            )}
          </Popover>
          {/* 크기 popover */}
          <Popover openOnHover placement="bottom-start" offset={8}
            trigger={<TBtn tooltip={L("크기", "Size")}><span className={styles.tblBarLabel}><Scaling size={15} strokeWidth={1.75} />{L("크기", "Size")}</span></TBtn>}>
            {() => (
              <div className={styles.tableMenu} onMouseDown={(e) => e.preventDefault()}>
                <div className={styles.tableGroup}>
                  <span className={styles.tableGroupLabel}>{L("크기", "Size")}</span>
                  {VID_SIZES.map((s) => (
                    <TBtn key={s.label} active={width === s.w} onClick={() => setAttr({ width: s.w, height: 0 })} tooltip={`${s.w}px`}>{s.label}</TBtn>
                  ))}
                  <TBtn onClick={setFull} tooltip={L("본문 너비에 맞춤", "Fit content width")}>Full</TBtn>
                </div>
                <div className={styles.tableGroup}>
                  <span className={styles.tableGroupLabel}>{t("editor.ratio")}</span>
                  <TBtn active={lock} onClick={() => setAttr({ lockAspect: !lock })} tooltip={lock ? t("editor.lockAspect") : t("editor.unlockAspect")}>
                    <span className={styles.tblBarLabel}>
                      {lock ? <LockIcon /> : <UnlockIcon />}{lock ? L("고정", "Locked") : L("해제", "Free")}
                    </span>
                  </TBtn>
                  <span className={styles.flexSpacer} />
                  <TBtn square onClick={() => setAttr({ width: 0, height: 0 })} tooltip={t("editor.restoreOriginal")}><RxReset size={14} /></TBtn>
                </div>
                {wVal > 0 && (
                  <>
                    <div className={styles.tableGroup}>
                      <span className={styles.tableGroupLabel}>{L("너비", "Width")}</span>
                      <NumberInput value={wVal} min={VID_MIN_PX} max={VID_MAX_PX} width={72} onCommit={commitW} ariaLabel="Width" />
                    </div>
                    <div className={styles.tableGroup}>
                      <span className={styles.tableGroupLabel}>{L("높이", "Height")}</span>
                      <NumberInput value={hVal} min={VID_MIN_PX} max={VID_MAX_PX} width={72} onCommit={commitH} ariaLabel="Height" />
                    </div>
                  </>
                )}
              </div>
            )}
          </Popover>
          {/* 재생 옵션 popover — 자동재생·반복·음소거·시작위치·다운로드 방지 */}
          <Popover openOnHover placement="bottom-start" offset={8}
            trigger={<TBtn tooltip={L("재생 옵션", "Playback")}><span className={styles.tblBarLabel}><Play size={15} strokeWidth={1.75} />{L("재생", "Play")}</span></TBtn>}>
            {() => (
              <div className={styles.tableMenu} onMouseDown={(e) => e.preventDefault()}>
                <div className={styles.tableGroup}>
                  <span className={styles.tableGroupLabel}>{L("옵션", "Options")}</span>
                  <TBtn active={vidAutoplay} onClick={() => setAttr(!vidAutoplay ? { vidAutoplay: true, vidMuted: true } : { vidAutoplay: false })} tooltip={L("발행글에서 자동 재생 (음소거 필요)", "Auto-play on published page (needs mute)")}>Autoplay</TBtn>
                  <TBtn active={vidLoop} onClick={() => setAttr({ vidLoop: !vidLoop })} tooltip={L("반복 재생", "Loop playback")}>Loop</TBtn>
                  <TBtn active={vidMuted} onClick={() => setAttr({ vidMuted: !vidMuted })} tooltip={L("음소거로 시작", "Start muted")}>Mute</TBtn>
                </div>
                <div className={styles.tableGroup}>
                  <span className={styles.tableGroupLabel}>{L("시작", "Start")}</span>
                  <NumberInput label="h" value={vsH} min={0} max={23} width={34} onCommit={(n) => setVidTime("h", n)} ariaLabel="hours" />
                  <NumberInput label="m" value={vsM} min={0} max={59} width={34} onCommit={(n) => setVidTime("m", n)} ariaLabel="minutes" />
                  <NumberInput label="s" value={vsS} min={0} max={59} width={34} onCommit={(n) => setVidTime("s", n)} ariaLabel="seconds" />
                </div>
                <div className={styles.tableGroup}>
                  <span className={styles.tableGroupLabel}>{L("보호", "Protect")}</span>
                  <TBtn active={noDownload} onClick={() => setAttr({ noDownload: !noDownload })} tooltip={L("다운로드 버튼·우클릭 저장 막기", "Block download button & right-click save")}>{L("다운로드 막기", "No download")}</TBtn>
                </div>
              </div>
            )}
          </Popover>
          {/* 캡션 — 동영상 아래 인라인 캡션 focus */}
          <TBtn active={hasCaption} onClick={focusCaption} tooltip={L("캡션 추가·편집", "Add/edit caption")}>
            <span className={styles.tblBarLabel}><Type size={15} strokeWidth={1.75} />{L("캡션", "Caption")}</span>
          </TBtn>
          <TBtn square className={styles.tableDangerBtn} onClick={deleteMedia} tooltip={t("editor.delete")}><Trash2 size={15} /></TBtn>
        </>
      ) : (
      <>
      {/* ── 임베드(iframe/YouTube) ── */}
      {/* 정렬 */}
      {(["left", "center", "right"] as const).map((a) => (
        <TBtn key={a} square active={align === a} onClick={() => setAttr({ align: a })}
          tooltip={a === "left" ? t("editor.left") : a === "center" ? t("editor.center") : t("editor.right")}>
          {ALIGN_ICONS[a]}
        </TBtn>
      ))}
      {/* 크기 — S/M/L/Full */}
      {SIZES.map((s) => (
        <TBtn key={s.label} active={width === s.w} onClick={() => setAttr({ width: s.w })} tooltip={s.w > 0 ? `${s.w}px` : L("전체 너비", "Full width")}>{s.label}</TBtn>
      ))}
      {/* YouTube 전용 옵션 */}
      {isYT && (
        <>
          <span className={styles.tblBarLabel}>
            <NumberInput label="h" value={hh} min={0} max={23} width={34} onCommit={(n) => setTime("h", n)} ariaLabel="hours" />
            <NumberInput label="m" value={mm} min={0} max={59} width={34} onCommit={(n) => setTime("m", n)} ariaLabel="minutes" />
            <NumberInput label="s" value={ss} min={0} max={59} width={34} onCommit={(n) => setTime("s", n)} ariaLabel="seconds" />
          </span>
          <TBtn active={ytAutoplay} onClick={() => setAttr({ ytAutoplay: !ytAutoplay })} tooltip={L("페이지 로드 시 자동 재생", "Auto-play on load")}>Autoplay</TBtn>
          <TBtn active={ytLoop} onClick={() => setAttr({ ytLoop: !ytLoop })} tooltip={L("반복 재생", "Loop playback")}>Loop</TBtn>
          <TBtn active={ytMute} onClick={() => setAttr({ ytMute: !ytMute })} tooltip={L("음소거로 시작", "Start muted")}>Mute</TBtn>
        </>
      )}
      {/* 임베드 전체 초기화 */}
      <TBtn square onClick={() => setAttr({ width: 0, align: "center", ytStart: 0, ytAutoplay: false, ytLoop: false, ytMute: false, ytControls: true })} tooltip={t("editor.restoreOriginal")}><RxReset size={13} /></TBtn>
      <TBtn square className={styles.tableDangerBtn} onClick={deleteMedia} tooltip={t("editor.delete")}><Trash2 size={15} /></TBtn>
      </>
      )}
    </FloatingBar>
  );
});
