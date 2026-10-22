"use client";

import { useRef, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ImageIcon, Plus, X } from "@/components/icons";
import Button from "@/components/ui/Button";
import Pressable from "@/components/ui/Pressable";
import Select from "@/components/ui/Select";
import { adminEditorStyles as es } from "@/components/admin/AdminEditorShell";
import { uploadFile } from "@/lib/adminUpload";
import { LANDING_DEMOS, LANDING_MEDIA_SIZES, type LandingDemo, type LandingMedia, type LandingMediaSize, type WorkLanding } from "@/types/workLanding";
import styles from "./LandingEditor.module.css";

/**
 * 작업물 편집기 — 추가 정보의 '랜딩 페이지' 카드. 한 언어치(편집 중인 언어) 내용을 고친다.
 * 설정에서 작업물 상세를 랜딩 페이지로 고르면 이 내용으로 그려진다(WorkLanding) — 글 없이 그림 위주.
 * 제목 위 한 줄과, 대표 화면 아래로 이어질 미디어(그림 · 영상 또는 데모, 칼럼 폭 / 화면 폭). 미디어를 비우면 갤러리 그림으로 채운다.
 */
export default function LandingEditor({
  value,
  onChange,
  tw,
  demoName,
  modeHint,
}: {
  value: WorkLanding;
  onChange: (next: WorkLanding) => void;
  tw: (key: string) => string;
  /** 데모 이름(공개 화면 문구 workDetail.landing.demo.*) */
  demoName: (demo: LandingDemo) => string;
  /** 지금 설정이 게시물 형태면 알리는 줄 */
  modeHint?: ReactNode;
}) {
  const setMedia = (media: LandingMedia[]) => onChange({ ...value, media });

  return (
    <div className={styles.wrap}>
      <p className={styles.hint}>{tw("landingHint")}</p>
      {modeHint}

      <label className={es.field}>
        <span className={es.fieldLabel}>{tw("landingEyebrow")}</span>
        <input
          className={es.fieldInput}
          value={value.eyebrow}
          onChange={(e) => onChange({ ...value, eyebrow: e.target.value })}
          placeholder={tw("landingEyebrowPlaceholder")}
        />
      </label>

      <section className={styles.group}>
        <div className={styles.groupHead}>
          <h3 className={es.fieldLabel}>{tw("landingMedia")}</h3>
          <span className={styles.groupHint}>{tw("landingMediaHint")}</span>
        </div>
        <div className={styles.rows}>
          {value.media.map((m, i) => (
            <Row key={i} index={i} list={value.media} onList={setMedia} tw={tw}>
              <MediaFields media={m} onChange={(nm) => setMedia(value.media.map((x, j) => (j === i ? nm : x)))} tw={tw} demoName={demoName} />
            </Row>
          ))}
        </div>
        <div className={styles.addRow}>
          <Button size="sm" variant="outline" onClick={() => setMedia([...value.media, { size: "inset" }])}>
            <Plus size={14} /> {tw("landingAddMedia")}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setMedia([...value.media, { size: "inset", demo: "translate" }])}>
            <Plus size={14} /> {tw("landingAddDemo")}
          </Button>
        </div>
      </section>
    </div>
  );
}

function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  const [it] = next.splice(from, 1);
  next.splice(to, 0, it);
  return next;
}

/** 목록 한 줄 — 왼쪽 번호, 오른쪽에 위/아래 · 지우기 */
function Row<T>({ index, list, onList, tw, children }: {
  index: number; list: T[]; onList: (l: T[]) => void; tw: (k: string) => string; children: ReactNode;
}) {
  return (
    <div className={styles.row}>
      <span className={styles.rowNo}>{String(index + 1).padStart(2, "0")}</span>
      <div className={styles.rowFields}>{children}</div>
      <div className={styles.rowActions}>
        <Pressable className={styles.iconBtn} onClick={() => onList(move(list, index, index - 1))} disabled={index === 0} aria-label={tw("landingMoveUp")}>
          <ArrowUp size={14} />
        </Pressable>
        <Pressable className={styles.iconBtn} onClick={() => onList(move(list, index, index + 1))} disabled={index === list.length - 1} aria-label={tw("landingMoveDown")}>
          <ArrowDown size={14} />
        </Pressable>
        <Pressable className={styles.iconBtn} onClick={() => onList(list.filter((_, j) => j !== index))} aria-label={tw("landingRemove")}>
          <X size={14} />
        </Pressable>
      </div>
    </div>
  );
}

/** 미디어 한 칸 — 종류(그림 · 영상 / 데모) · 크기 또는 데모 · 주소 */
function MediaFields({ media, onChange, tw, demoName }: {
  media: LandingMedia; onChange: (m: LandingMedia) => void; tw: (k: string) => string; demoName: (d: LandingDemo) => string;
}) {
  const isDemo = !!media.demo;
  return (
    <>
      <div className={styles.mediaHead}>
        <Select
          size="sm"
          value={isDemo ? "demo" : "image"}
          options={[{ value: "image", label: tw("landingKindImage") }, { value: "demo", label: tw("landingKindDemo") }]}
          onChange={(v) => onChange(v === "demo" ? { size: "inset", demo: media.demo ?? "translate" } : { size: media.size, src: media.src })}
        />
        {/* 그림 · 영상은 칼럼 폭 / 화면 폭, 데모는 칼럼 폭 창으로만 띄운다 */}
        {isDemo ? (
          <Select
            size="sm"
            value={media.demo ?? "translate"}
            options={LANDING_DEMOS.map((d) => ({ value: d, label: demoName(d) }))}
            onChange={(v) => onChange({ ...media, demo: v as LandingDemo })}
          />
        ) : (
          <Select
            size="sm"
            value={media.size}
            options={LANDING_MEDIA_SIZES.map((s) => ({ value: s, label: tw(`landingSize_${s}`) }))}
            onChange={(v) => onChange({ ...media, size: v as LandingMediaSize })}
          />
        )}
      </div>
      {!isDemo && <ImageInput value={media.src ?? ""} onChange={(src) => onChange({ ...media, src: src || undefined })} tw={tw} />}
    </>
  );
}

/** 그림 · 영상 — 주소를 적거나 파일을 올린다. 그림은 작은 미리보기로 */
function ImageInput({ value, onChange, tw }: { value: string; onChange: (url: string) => void; tw: (k: string) => string }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setFailed(false);
    try {
      onChange(await uploadFile(file, "works"));
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };
  const isVideo = /\.(mp4|webm|mov)(\?|#|$)/i.test(value);
  return (
    <div className={styles.image}>
      {value && !isVideo ? (
        // eslint-disable-next-line @next/next/no-img-element -- 편집기 미리보기(아무 주소나 들어온다)
        <img src={value} alt="" className={styles.imageThumb} />
      ) : (
        <span className={styles.imageThumb} aria-hidden><ImageIcon size={14} /></span>
      )}
      <input className={es.fieldInput} value={value} placeholder={tw("landingImagePlaceholder")} onChange={(e) => onChange(e.target.value)} />
      <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={busy}>
        {busy ? tw("landingUploading") : tw("landingUpload")}
      </Button>
      <input ref={fileRef} type="file" accept="image/*,video/mp4,video/webm" hidden onChange={(e) => onFile(e.target.files?.[0])} />
      {failed && <span className={styles.imageError}>{tw("landingUploadFailed")}</span>}
    </div>
  );
}
