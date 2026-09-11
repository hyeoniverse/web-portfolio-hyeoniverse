"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import css from "../../AboutStudio.module.css";
import { AboutFontPicker } from "../fields";
import { Plus, Lock } from "@/components/icons";
import cf from "@/components/layout/CreditsFooter/CreditsFooter.module.css";
import { AlignIcon } from "@/components/posts/plate/icons";
import FloatingBar from "@/components/posts/plate/toolbars/FloatingBar";
import Button from "@/components/ui/Button";
import Chip from "@/components/ui/Chip";
import { useChipReorder } from "@/components/ui/Chip/useChipReorder";
import NumberInput from "@/components/ui/NumberInput";
import Pressable from "@/components/ui/Pressable";
import Textarea from "@/components/ui/Textarea";
import { type SiteConfigData } from "@/config/site.config";
import { type TFunction } from "@/providers/LanguageProvider";
import { type Language } from "@/types";
import { useL } from "../primitives";
/* 덧붙일 문구 제한 — 저작자 표시 아래 보조 문구라 길어질 이유가 없다.
   행 수를 고정해 문구 길이와 무관하게 프리뷰 높이를 일정하게 유지한다. */
const CREDITS_NOTE_MAX = 160;

const CREDITS_NOTE_ROWS = 4;

/* ═══════════ Credits ═══════════ */
export function CreditsBlock({ about, setAny, lang, nickname, t }: {
  about: SiteConfigData["about"]; setAny: (k: string, v: unknown) => void; lang: Language;
  nickname: string; t: TFunction;
}) {
  const L = useL();
  /* 저작자 표시 문구(로케일)와 소유자 이름은 고정 — 편집 대상이 아니다.
     문구를 자유롭게 바꿀 수 있으면 이름만 잠가봐야 표시 자체가 무력화된다. */
  const [before = "", after = ""] = t("aboutPage.credits").split("❤");

  const rec = about as unknown as Record<string, string | undefined>;
  const noteKey = lang === "ko" ? "creditsNote_ko" : "creditsNote";
  const note = rec[noteKey] ?? "";

  const noteAlign = (rec.creditsNoteAlign as "left" | "center" | "right") || "left";
  const notePx = parseInt(rec.creditsNoteFontSize || "", 10) || 14;
  const noteLh = parseFloat(rec.creditsNoteLineHeight || "") || 1.6;
  /* 보기/편집 양쪽에 같은 타이포를 적용해 전환해도 글자가 안 튄다 */
  /* 직접 속성은 보기 모드(p)용, --note-* 는 공통 Textarea 내부 규칙을 넘기 위한 편집 요소용.
     Textarea 는 style 을 편집 요소로 안 내려주고 자체 폰트 규칙이 상속을 덮는다. */
  const noteStyle = {
    fontSize: rec.creditsNoteFontSize || undefined,
    fontFamily: rec.creditsNoteFontFamily || undefined,
    lineHeight: rec.creditsNoteLineHeight || undefined,
    textAlign: noteAlign,
    "--note-ff": rec.creditsNoteFontFamily || "inherit",
    "--note-fs": rec.creditsNoteFontSize || "inherit",
    "--note-lh": rec.creditsNoteLineHeight || "inherit",
    /* 보기 모드 min-height 계산용 (단위 없는 배수) */
    "--note-lh-num": noteLh,
    "--note-align": noteAlign,
  } as CSSProperties;

  const names = (about.creditsNames ?? []);
  const setNames = (v: string[]) => setAny("creditsNames", v);
  const MAX_NAMES = 8;
  const [adding, setAdding] = useState(false);
  const [editingName, setEditingName] = useState<number | null>(null);
  /* 이름 순서 변경 — 공통 useChipReorder */
  const nameDrag = useChipReorder((from, to) => {
    const next = [...names];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setNames(next);
  });
  const noteRef = useRef<HTMLDivElement>(null);
  const [noteFocused, setNoteFocused] = useState(false);
  /* 바깥 클릭으로 닫는다. blur 로 판정하면 FontPicker 처럼 포커스를 안 가져가는
     트리거를 눌렀을 때 activeElement 가 body 가 되어 바가 즉시 닫힌다. */
  useEffect(() => {
    if (!noteFocused) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      if (noteRef.current?.contains(t)) return;
      if (t.closest('[class*="floatingBar"]')) return;
      /* 바 안 컨트롤이 여는 드롭다운(Select/FontPicker)은 body 로 portal 된다.
         이걸 "바깥"으로 보면 항목을 고르는 순간 편집이 닫혀 선택이 취소된다. */
      if (t.closest('[class*="Select-module"], [class*="FontPicker-module"], [class*="ColorPicker-module"]')) return;
      setNoteFocused(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [noteFocused]);

  return (
    <section className={css.block}>
      {/* 긴 문장이라 헤더 옆 inline 대신 헤더 아래 block hint 로 (AccountTab·AppearanceTab 과 동일 패턴) */}
      <p className={css.creditsNotice}>
        <Lock size={12} />
        {L("저작자 표시 문구와 원작자 이름은 고정입니다. 포크·재배포 시에도 유지해 주세요. 함께 만든 분의 이름과 덧붙일 문구는 추가할 수 있습니다.", "The attribution phrase and original author name are fixed. Please keep them when forking or redistributing — you may add contributor names and a note.")}
      </p>
      <div className={css.creditsPreview}>
        {/* 폭 고정 — 이름을 추가하면 줄이 길어져 래퍼가 늘어나고 아래 textarea 까지 같이 넓어진다 */}
        <div className={css.creditsBody}>
          <p className={cf.text}>
            <span className={css.creditsLocked}>{before}</span>
            <span className={cf.heart}>❤</span>
            <span className={css.creditsLocked}>{after} </span>
            <span className={css.creditsFixed}
              title={L("원작자 표기 — 포크·재배포 시에도 유지해 주세요", "Original author attribution — please keep it when forking or redistributing")}>
              {nickname}
              <Lock size={11} />
            </span>
            {names.map((n, i) => {
              const { dragging, dropSide, ...dragProps } = nameDrag.itemProps(i);
              if (editingName === i) {
                return (
                  <input key={i} className={css.creditsNameInput} autoFocus defaultValue={n}
                    aria-label={L("이름 수정", "Edit name")}
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      setEditingName(null);
                      setNames(v ? names.map((x, j) => (j === i ? v : x)) : names.filter((_, j) => j !== i));
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                      if (e.key === "Escape") setEditingName(null);
                    }} />
                );
              }
              return (
                <Chip key={i} className={css.creditsChip} showHandle
                  dragging={dragging} dropSide={dropSide}
                  dragHandlers={{ draggable: true, ...dragProps }}
                  onRemove={() => setNames(names.filter((_, x) => x !== i))}
                  onClick={(e) => { if (e.detail === 2) setEditingName(i); }}>
                  {n}
                </Chip>
              );
            })}
            {/* 이름 줄 안에서 바로 이어 붙인다 — 별도 줄로 빼면 무엇에 붙는 이름인지 흐려진다 */}
            {names.length < MAX_NAMES && (
              /* 버튼 ↔ 입력이 같은 캡슐 안에서 폭만 늘어나며 이어진다(morph).
                 서로 교체하면 튀어 보여서 껍데기는 유지하고 안쪽만 바꾼다. */
              <span className={`${css.creditsNameAdd} ${adding ? css.creditsNameAddOpen : ""}`}>
                {adding ? (
                  <input className={css.creditsNameInput} autoFocus
                    aria-label={L("추가할 이름", "Name to add")}
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      setAdding(false);
                      if (v && !names.includes(v)) setNames([...names, v]);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                      if (e.key === "Escape") setAdding(false);
                    }} />
                ) : (
                  <Pressable className={css.creditsNameAddBtn} onClick={() => setAdding(true)}
                    title={L("이름 추가", "Add name")} aria-label={L("이름 추가", "Add name")}>
                    <Plus size={13} />
                  </Pressable>
                )}
              </span>
            )}
          </p>
          {/* 덧붙이는 문구 — 실제 화면에서도 표시 문구 아래에 약하게 들어간다.
              길이에 따라 프리뷰 높이가 출렁이지 않도록 최대 줄 수까지 미리 자리를 잡아둔다. */}
          {/* 공통 Textarea — maxHint 를 주면 글자수 카운터와 지우개가
              textarea 안쪽 우하단 glass chip 으로 함께 들어간다 */}
          {/* 평소엔 실제 모습 그대로, 클릭하면 그때 입력으로 바꾼다 —
              상시 textarea 면 테두리·플레이스홀더 때문에 결과를 가늠하기 어렵다 */}
          <div ref={noteRef} className={css.creditsNoteWrap} style={noteStyle} onFocusCapture={() => setNoteFocused(true)}>
          {/* 요소를 갈아끼우지 않고 같은 Textarea 를 유지한다 —
              보기/편집을 서로 다른 요소로 두면 박스 모델이 달라 높이가 튄다.
              편집이 아닐 때는 테두리·카운터를 숨겨 실제 렌더처럼 보이게만 한다. */}
          <Textarea className={`${css.creditsNote} ${noteFocused ? "" : css.creditsNoteQuiet}`}
            textareaClassName={css.creditsNoteInput}
            value={note} maxHint={CREDITS_NOTE_MAX} maxLength={CREDITS_NOTE_MAX} rows={CREDITS_NOTE_ROWS}
            onChange={(v) => setAny(noteKey, v.slice(0, CREDITS_NOTE_MAX))}
            placeholder={L("문구 추가", "Add note")}
            aria-label={L("덧붙일 문구", "Additional note")} />
          </div>
          {/* 타이포 컨트롤은 입력 중에만 뜨는 floating bar — 상시 노출하면 프리뷰가 어수선해진다 */}
          <FloatingBar inline open={noteFocused} getAnchorRect={() => noteRef.current?.getBoundingClientRect() ?? new DOMRect()}
            onFocusCapture={() => setNoteFocused(true)} onBlurCapture={() => setNoteFocused(false)}>
            <NumberInput className={css.barStepper} value={notePx} unit="px" width={52}
              ariaLabel={L("글자 크기", "Font size")} min={10} max={28} step={1}
              onCommit={(n) => setAny("creditsNoteFontSize", `${n}px`)} />
            {/* floating bar 위를 덮지 않게 아래로 연다 */}
            <AboutFontPicker value={rec.creditsNoteFontFamily || ""}
              onChange={(v) => setAny("creditsNoteFontFamily", v)}
              fallbackLabel={t("admin.settings.aboutHeroDefault")} dropAlign="below" />
            <NumberInput className={css.barStepper} value={noteLh} width={56} step={0.1}
              min={1} max={2.4} label={L("줄", "LH")}
              ariaLabel={L("줄 간격", "Line height")}
              onCommit={(n) => setAny("creditsNoteLineHeight", String(Math.round(n * 10) / 10))} />
            {/* 타이포 컨트롤과 정렬은 성격이 달라 구분선으로 끊는다 */}
            <span className={css.barDivider} aria-hidden />
            {(["left", "center", "right"] as const).map((a) => (
              <Button key={a} variant={noteAlign === a ? "primary" : "subtle"} shape="circle" size="sm"
                onClick={() => setAny("creditsNoteAlign", a)}
                aria-label={a === "left" ? (L("왼쪽 정렬", "Align left"))
                  : a === "center" ? (L("가운데 정렬", "Align center"))
                    : (L("오른쪽 정렬", "Align right"))}
                aria-pressed={noteAlign === a}>
                <AlignIcon align={a} />
              </Button>
            ))}
          </FloatingBar>
        </div>
      </div>


    </section>
  );
}
