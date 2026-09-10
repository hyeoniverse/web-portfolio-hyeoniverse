"use client";

import { useRef, useState } from "react";
import { useDepsChanged } from "@/hooks/useDepsChanged";
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
} from "@/components/icons";
import { useLanguage } from "@/providers/LanguageProvider";
import { isVideoUrl } from "@/lib/isVideoUrl";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Popover from "@/components/ui/Popover";
import EmojiPicker, { EmojiIcon } from "@/components/ui/EmojiPicker";
import styles from "./CoverBanner.module.css";
import Pressable from "@/components/ui/Pressable";

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
  /** 커버 세로 위치 % (object-position, 0~100) — 저장값 */
  position?: number;
  /** 커버 확대 배율 (scale, 1~2.5) — 저장값 */
  zoom?: number;
  /** 위치 조정 저장 시 호출 (DB 반영) */
  onPositionChange?: (position: number) => void;
  onZoomChange?: (zoom: number) => void;
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
  position: positionProp = 50,
  zoom: zoomProp = 1,
  onPositionChange,
  onZoomChange,
}: CoverBannerProps) {
  const { t } = useLanguage();
  const [urlDraft, setUrlDraft] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);

  // ── 커버 위치/줌 (드래그 중 로컬 상태, 저장값은 props) ──
  const [position, setPosition] = useState(positionProp); // object-position 세로 % (0~100)
  const [zoom, setZoom] = useState(zoomProp); // scale 배율 (1~2.5)
  const [reposition, setReposition] = useState(false); // 위치 조정 모드 여부
  // 부모 값(prop)이 바뀌면(draft 복원 등) 로컬 상태 동기화 — 단 위치 조정 중(드래그)엔 사용자 입력 보호
  // reposition 은 일부러 비교에서 뺀다 — 드래그를 마쳤다고 부모 값으로 되돌리면 안 된다.
  const coverPropsChanged = useDepsChanged([positionProp, zoomProp]);
  if (coverPropsChanged && !reposition) { setPosition(positionProp); setZoom(zoomProp); }

  // 드래그 추적용 ref (position 백업 + 시작 좌표)
  const dragRef = useRef<{ startY: number; startPos: number } | null>(null);
  // 위치 조정 진입 시점 백업 (취소 시 복원용)
  const backupRef = useRef<{ position: number; zoom: number } | null>(null);

  const ZOOM_MIN = 1;
  const ZOOM_MAX = 2.5;
  const ZOOM_STEP = 0.25;

  const clamp = (v: number, min: number, max: number) =>
    Math.min(max, Math.max(min, v));

  const hasCover = !!cover.trim();

  // 위치 조정 모드 진입 — 취소 대비 현재값 백업
  const enterReposition = () => {
    backupRef.current = { position, zoom };
    setReposition(true);
  };
  // 저장 — 로컬 값을 props(DB)로 반영
  const saveReposition = () => {
    onPositionChange?.(position);
    onZoomChange?.(zoom);
    backupRef.current = null;
    setReposition(false);
    dragRef.current = null;
  };
  // 취소 — 진입 시점 값으로 복원
  const cancelReposition = () => {
    if (backupRef.current) { setPosition(backupRef.current.position); setZoom(backupRef.current.zoom); }
    backupRef.current = null;
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
      <Input
        size="sm"
        value={urlDraft}
        placeholder={t("editor.cover.urlPlaceholder")}
        onChange={setUrlDraft}
        className={styles.urlInput}
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
                onClick={saveReposition}
              >
                {t("editor.cover.savePosition")}
              </Button>
              <Button
                variant="difference"
                shape="capsule"
                size="md"
                soundDisabled
                icon={<X size={15} strokeWidth={2} />}
                onClick={cancelReposition}
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
          <Pressable noTapScale
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
          </Pressable>

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
