"use client";

import { useRef, useState } from "react";
import {
  Image as ImageIcon,
  Smile,
  Upload,
  Link2,
  Trash2,
  Move,
  ZoomIn,
  ZoomOut,
  Check,
  X,
  Plus,
} from "lucide-react";
import { useLanguage } from "@/providers/LanguageProvider";
import { isVideoUrl } from "@/lib/isVideoUrl";
import Button from "@/components/ui/Button";
import Popover from "@/components/ui/Popover";
import EmojiPicker, { EmojiIcon } from "@/components/ui/EmojiPicker";
import styles from "./CoverBanner.module.css";

interface CoverBannerProps {
  /** 현재 커버 이미지/비디오 URL ("" 면 비어있음) */
  cover: string;
  /** 커버 URL 변경 — "" 전달 시 제거 */
  onCoverChange: (url: string) => void;
  /** 업로드 트리거 — caller 가 파일 선택 후 onCoverChange 로 url 반영 */
  onUpload: () => void;
  /** 페이지 이모지 (native / img:url / icon:id), null 이면 미설정 */
  emoji: string | null;
  onEmojiChange: (e: string | null) => void;
}

/**
 * 커버 배너 + 페이지 이모지.
 * 에디터 콘텐츠 최상단(title 위)에 렌더되어 full-width 배너를 제공.
 * - 컨트롤은 hover 시에만 노출 (subtle).
 * - 커버는 기존 cover_image / image 필드를 그대로 편집 (별도 저장 없음).
 */
export default function CoverBanner({
  cover,
  onCoverChange,
  onUpload,
  emoji,
  onEmojiChange,
}: CoverBannerProps) {
  const { t } = useLanguage();
  const [urlDraft, setUrlDraft] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);

  // ── 커버 위치/줌 (로컬 상태) ──
  // TODO: 커버 위치/줌 저장 방식 확정 후 연동 (현재는 이모지와 동일하게 DB 미연동)
  const [position, setPosition] = useState(50); // object-position 세로 % (0~100)
  const [zoom, setZoom] = useState(1); // scale 배율 (1~2.5)
  const [reposition, setReposition] = useState(false); // 위치 조정 모드 여부

  // 드래그 추적용 ref (position 백업 + 시작 좌표)
  const dragRef = useRef<{ startY: number; startPos: number } | null>(null);

  const ZOOM_MIN = 1;
  const ZOOM_MAX = 2.5;
  const ZOOM_STEP = 0.25;

  const clamp = (v: number, min: number, max: number) =>
    Math.min(max, Math.max(min, v));

  const hasCover = !!cover.trim();

  // 위치 조정 모드 진입/이탈
  const enterReposition = () => setReposition(true);
  const exitReposition = () => {
    setReposition(false);
    dragRef.current = null;
  };

  // 드래그로 세로 위치 변경 (배너 높이 대비 이동 비율 → position %)
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!reposition || !hasCover) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { startY: e.clientY, startPos: position };
  };
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const { startY, startPos } = dragRef.current;
    const h = e.currentTarget.clientHeight || 1;
    // 위로 끌면 아래쪽이 보이도록(0→100), 자연스러운 방향: dy 음수 → position 증가
    const deltaPct = ((startY - e.clientY) / h) * 100;
    setPosition(clamp(startPos + deltaPct, 0, 100));
  };
  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current) {
      e.currentTarget.releasePointerCapture(e.pointerId);
      dragRef.current = null;
    }
  };

  const zoomIn = () => setZoom((z) => clamp(z + ZOOM_STEP, ZOOM_MIN, ZOOM_MAX));
  const zoomOut = () => setZoom((z) => clamp(z - ZOOM_STEP, ZOOM_MIN, ZOOM_MAX));

  // 커버 미디어에 적용할 인라인 스타일 (기본값일 때 기존과 동일하게 렌더)
  const mediaStyle: React.CSSProperties = {
    objectFit: "cover",
    objectPosition: `50% ${position}%`,
    transform: `scale(${zoom})`,
    transformOrigin: "center",
  };

  // 커버 변경 / 추가 Popover 내용
  const coverMenu = ({ close }: { close: () => void }) => (
    <div className={styles.menu}>
      <Button
        variant="ghost"
        size="sm"
        icon={<Upload size={14} strokeWidth={2} />}
        className={styles.menuBtn}
        onClick={() => {
          onUpload();
          close();
        }}
      >
        {t("editor.cover.upload")}
      </Button>
      <div className={styles.menuDivider} />
      <input
        className={styles.urlInput}
        type="text"
        value={urlDraft}
        placeholder={t("editor.cover.urlPlaceholder")}
        onChange={(e) => setUrlDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.nativeEvent.isComposing && urlDraft.trim()) {
            onCoverChange(urlDraft.trim());
            setUrlDraft("");
            close();
          }
        }}
      />
      <Button
        variant="ghost"
        size="sm"
        icon={<Link2 size={14} strokeWidth={2} />}
        className={styles.menuBtn}
        disabled={!urlDraft.trim()}
        onClick={() => {
          if (!urlDraft.trim()) return;
          onCoverChange(urlDraft.trim());
          setUrlDraft("");
          close();
        }}
      >
        {t("editor.cover.applyUrl")}
      </Button>
      {hasCover && (
        <>
          <div className={styles.menuDivider} />
          <Button
            variant="ghost"
            tone="danger"
            size="sm"
            icon={<Trash2 size={14} strokeWidth={2} />}
            className={styles.menuBtn}
            onClick={() => {
              onCoverChange("");
              close();
            }}
          >
            {t("editor.cover.remove")}
          </Button>
        </>
      )}
    </div>
  );

  return (
    <div className={styles.wrap}>
      {/* ── 커버 배너 ── */}
      <div
        className={`${styles.banner}${hasCover ? "" : ` ${styles.bannerEmpty}`}${
          reposition ? ` ${styles.bannerRepositioning}` : ""
        }`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {hasCover &&
          (isVideoUrl(cover) ? (
            <video
              className={styles.media}
              style={mediaStyle}
              src={cover}
              muted
              playsInline
              autoPlay
              loop
              preload="metadata"
            />
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              className={styles.media}
              style={mediaStyle}
              src={cover}
              alt={t("editor.cover.label")}
              draggable={false}
            />
          ))}

        {/* 위치 조정 모드 안내 힌트 */}
        {reposition && (
          <div className={styles.repositionHint}>{t("editor.cover.repositionHint")}</div>
        )}

        {/* hover 컨트롤 (우상단) */}
        {/* 컨트롤 위 pointerdown 은 배너 드래그(setPointerCapture)로 전파되면 버튼 클릭이 삼켜짐 → 차단 */}
        <div className={styles.controls} onPointerDown={(e) => e.stopPropagation()}>
          {reposition ? (
            /* ── 위치 조정 모드: 줌 +/− + 저장/취소 ── */
            <>
              <Button
                variant="difference"
                shape="circle"
                size="md"
                soundDisabled
                icon={<ZoomOut size={15} strokeWidth={2} />}
                onClick={zoomOut}
                disabled={zoom <= ZOOM_MIN}
                title={t("editor.cover.zoomOut")}
              />
              <Button
                variant="difference"
                shape="circle"
                size="md"
                soundDisabled
                icon={<ZoomIn size={15} strokeWidth={2} />}
                onClick={zoomIn}
                disabled={zoom >= ZOOM_MAX}
                title={t("editor.cover.zoomIn")}
              />
              <Button
                variant="difference"
                shape="capsule"
                size="md"
                soundDisabled
                icon={<Check size={15} strokeWidth={2} />}
                onClick={exitReposition}
              >
                {t("editor.cover.savePosition")}
              </Button>
              <Button
                variant="difference"
                shape="capsule"
                size="md"
                soundDisabled
                icon={<X size={15} strokeWidth={2} />}
                onClick={exitReposition}
              >
                {t("editor.cover.cancel")}
              </Button>
            </>
          ) : (
            /* ── 기본 컨트롤 ── */
            <>
              <Popover
                placement="bottom-end"
                sheetTitle={hasCover ? t("editor.cover.change") : t("editor.cover.add")}
                trigger={
                  <Button
                    variant="difference"
                    shape="capsule"
                    size="sm"
                    soundDisabled
                    icon={<ImageIcon size={13} strokeWidth={2} />}
                  >
                    {hasCover ? t("editor.cover.change") : t("editor.cover.add")}
                  </Button>
                }
              >
                {coverMenu}
              </Popover>

              {/* 커버가 있을 때만 위치 조정 진입 */}
              {hasCover && (
                <Button
                  variant="difference"
                  shape="capsule"
                  size="sm"
                  soundDisabled
                  icon={<Move size={13} strokeWidth={2} />}
                  onClick={enterReposition}
                >
                  {t("editor.cover.reposition")}
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── 페이지 이모지 ── */}
      <div className={`${styles.emojiRow}${hasCover ? "" : ` ${styles.emojiRowNoCover}`}`}>
        <div className={styles.emojiAnchor}>
          {/* 단일 버튼 — emoji 유무에 따라 내용만 바뀌도록(엘리먼트 유지) 해서
              active→normal frost transition 이 끊기지 않게 */}
          <button
            type="button"
            className={`${styles.emojiBtn}${emoji ? "" : ` ${styles.addEmojiBtn}`}${
              hasCover ? ` ${styles.emojiBtnOverlay}` : ""
            }${emojiOpen ? ` ${styles.emojiBtnActive}` : ""}`}
            onClick={() => setEmojiOpen(true)}
            title={emoji ? t("editor.cover.changeIcon") : t("editor.cover.addIcon")}
          >
            {emoji ? (
              <EmojiIcon value={emoji} size={56} />
            ) : (
              <>
                <Smile size={32} strokeWidth={1.75} />
                <span className={styles.addPlusBadge}>
                  <Plus size={13} strokeWidth={3} />
                </span>
              </>
            )}
          </button>

          {/* EmojiPicker — anchor 기준 absolute 팝업 */}
          <EmojiPicker
            open={emojiOpen}
            onClose={() => setEmojiOpen(false)}
            onSelect={(val) => onEmojiChange(val || null)}
            currentValue={emoji ?? undefined}
          />
        </div>
      </div>
    </div>
  );
}
