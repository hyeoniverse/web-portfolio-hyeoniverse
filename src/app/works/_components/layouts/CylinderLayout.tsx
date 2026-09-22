"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "@/providers/ThemeProvider";
import { useLanguage } from "@/providers/LanguageProvider";
import T from "@/components/ui/T";
import { pickLocalized } from "@/types/common";
import { SITE_TIME_ZONE } from "@/constants";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import { showToast } from "@/stores/toastStore";
import TransitionLink from "@/components/ui/TransitionLink";
import Pressable from "@/components/ui/Pressable";
import { isPlainClick } from "@/utils/gestureUtils";
import { workHref, type WorksLayoutProps } from "./shared";
import { useCylinderStage } from "./cylinder/useCylinderStage";
import CylinderIntroPanel from "./cylinder/CylinderIntroPanel";
import CylinderCommentBubbles from "./cylinder/CylinderCommentBubbles";
import { useFloatingComments } from "./cylinder/useFloatingComments";
import { PANEL_ARC, SLOT_ANGLE } from "./cylinder/scene";
import { textUnits } from "../../_utils";
import dynamic from "next/dynamic";
import styles from "./CylinderLayout.module.css";

/* 3D 는 서버에서 그릴 수 없어 브라우저에서만 붙인다. 이 화면의 나머지(인트로 패널·제목)는
   정적으로 남아 서버 HTML 에 들어간다. Suspense 로 감싸 bailout 이 이 자리에만 머물게 한다. */
const CylinderCanvas = dynamic(() => import("./cylinder/CylinderCanvas"), { ssr: false });

/* ── 실린더 레이아웃 ──
   작품 이미지를 곡면 패널로 만들어 세로 원통에 두르고, 휠로 굴린다. 생김새는 andreasantonsson.dev 를 따른다 —
   눕힌 원통의 안쪽 벽, 판마다 분류·큰 세리프 제목·둥근 화살표 단추, 화면 위아래를 덮는 그라데이션.
   3D 는 VerticalCylinder 가 그리고, 제목 같은 텍스트는 DOM 오버레이로 띄운 뒤
   useCylinderStage 가 3D 투영 좌표를 받아 매 프레임 위치를 맞춘다(판이 끝없이 돌아야 해서, 레퍼런스처럼
   글자를 페이지 흐름에 두지 않고 판에 붙인다). */
export default function CylinderLayout({ projects, onProjectClick, bare = false }: WorksLayoutProps & {
  /**
   * 보여줄 작업물이 없을 때의 모드(#1062).
   *
   * 배경을 깔지 않고(뒤의 은하수·꽃잎이 보여야 한다), 굴리지 않고(돌릴 칸이 없다), 판과 그 위의
   * 인트로 글자도 그리지 않는다 — 보여줄 것이 없는데 첫 칸만 덩그러니 띄울 이유가 없다.
   * 몽이는 남는다. 빈 화면에 아무도 없으면 고장 난 화면처럼 보인다.
   */
  bare?: boolean;
}) {
  const { theme } = useTheme();
  const { t, language } = useLanguage();

  /* 인트로 이미지는 캔버스에 그려 만드는 값이라 브라우저에서만 계산할 수 있다.
     여기서 만들면 서버 렌더가 document 를 찾다 깨지므로 CylinderCanvas 안으로 옮겼다. */
  const isDark = theme === "dark";
  const projectImages = useMemo(() => projects.map((p) => p.image), [projects]);
  /* 표지가 없는 칸에 그릴 판의 씨앗 — 카드의 대체 표지와 같은 값을 써서 같은 그림이 나온다 */
  const projectSeeds = useMemo(() => projects.map((p) => p.slug || p.id), [projects]);
  // 슬롯 = 인트로 1 + 작품 N
  const slotCount = projectImages.length + 1;
  const projectsById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);
  /* 판 크기는 칸 수와 상관없이 같다. 칸이 적어도 뒤쪽이 비지 않는 것은 판들이 원통에 박혀 있지 않고
     띠처럼 돌기 때문이다(scene.ts 의 slotOffset) */
  const segAngle = SLOT_ANGLE;
  const arc = PANEL_ARC;

  const {
    scrollRef,
    mouseRef,
    actualRotRef,
    screenPosRef,
    slotRefs,
    overlayRefs,
    indicatorRef,
    indicatorFrameRef,
    wrapRef,
    floatingCommentsRef,
    slotBoundsRef,
    hoverDimRef,
    rotateTo,
  } = useCylinderStage({
    slotCount,
    segAngle,
    arc,
    indicatorDotActiveClassName: styles.indicatorDotActive,
    /* 인트로 칸만 있는 화면은 굴리지 않는다 — 돌리면 그 칸에 붙은 글자와 몽이가 따라 나간다 */
    frozen: bare,
  });

  const { recentComments, bubbleRefs } = useFloatingComments(slotBoundsRef);

  const handleClick = useCallback((projectIdx: number, e?: MouseEvent) => {
    const p = projects[projectIdx];
    // 판은 캔버스라 링크가 아니다. 보조 키·가운데 클릭은 링크처럼 새 탭으로 연다(#938)
    if (e && !isPlainClick(e)) {
      window.open(workHref(p), "_blank", "noopener");
      return;
    }
    const slotIdx = projectIdx + 1;
    const el = slotRefs.current.get(slotIdx);
    if (el) onProjectClick(p, el.getBoundingClientRect());
    // slotRefs 는 훅이 돌려준 ref 객체라 참조가 고정 — deps 에 넣으면 컴파일러가 메모를 버린다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects, onProjectClick]);

  /* 판 위의 링크(→ 단추)에 올리면 광선 판정은 판에서 떠난 것으로 쳐서 판이 다시 밝아지고, 흰 글자가
     밝은 사진 위에 놓인다. 링크에 올려 둔 동안은 판에 올린 것처럼 그 판을 어둡게 둔다(값은 VerticalCylinder 의 메시 번호 + 1).
     React 의 onPointerEnter 는 pointerout 때 흉내 내어 보내져, 판에서 떠났다며 값을 지우는 r3f 의 pointerleave 보다 먼저 온다.
     pointerover 는 그 뒤에 온다 */
  const holdDim = (slotIndex: number) => ({
    onPointerOver: () => { hoverDimRef.current = slotIndex + 1; },
    onPointerLeave: () => { if (hoverDimRef.current === slotIndex + 1) hoverDimRef.current = 0; },
  });

  return (
    <div ref={wrapRef} className={`${styles.wrap} ${bare ? styles.wrapBare : ""}`}>
      {/* 판은 캔버스라 초점을 받지 못한다. 키보드로 작업물에 닿도록 초점이 오면 보이는 목록을 두고,
          초점이 옮겨 가면 원통을 그 작업물로 돌린다. 서버 HTML 에도 작업물 주소가 들어간다(#938) */}
      <nav className={styles.workList} aria-label={t("nav.works")}>
        <ul className={styles.workListItems}>
          {projects.map((proj, i) => (
            <li key={proj.id}>
              <TransitionLink
                href={workHref(proj)}
                className={styles.workListLink}
                onFocus={() => rotateTo(i + 1)}
                navigate={() => handleClick(i)}
              >
                {pickLocalized(proj.title, language)}
              </TransitionLink>
            </li>
          ))}
        </ul>
      </nav>

      <Suspense fallback={null}>
        <CylinderCanvas
          canvasClassName={styles.canvas}
          heartsClassName={styles.hearts}
          hoveredItemClassName={styles.metaItemHovered}
          hoveredOverlayClassName={styles.metaOverlayHovered}
          projectImages={projectImages}
          projectSeeds={projectSeeds}
          isDark={isDark}
          segAngle={segAngle}
          arc={arc}
          scrollRef={scrollRef}
          mouseRef={mouseRef}
          actualRotRef={actualRotRef}
          screenPosRef={screenPosRef}
          hoverDimRef={hoverDimRef}
          slotRefs={slotRefs}
          overlayRefs={overlayRefs}
          hidePanels={bare}
          onSlotClick={handleClick}
        />
      </Suspense>

      {/* 보여줄 것이 없으면 인트로 글자도 두지 않는다 — 판이 없으니 얹힐 자리도 없다 */}
      {!bare && <CylinderIntroPanel slotRefs={slotRefs} />}

      <CylinderCommentBubbles
        comments={recentComments}
        bubbleRefs={bubbleRefs}
        containerRef={floatingCommentsRef}
        projectsById={projectsById}
      />

      {/* Slot 1~N — 분류·제목. 클릭은 3D 이미지 panel 자체가 받음 (pointer-events: none) */}
      {projects.map((proj, i) => {
        const slotIndex = i + 1;
        return (
          <div
            key={proj.id}
            ref={(el) => { if (el) slotRefs.current.set(slotIndex, el); }}
            className={styles.metaItem}
            /* 제목이 길수록 글자를 줄인다 — 두 언어 중 긴 쪽을 기준으로 잡아 언어를 바꿀 때
               크기가 뛰지 않게 한다(#1062) */
            style={{
              visibility: "hidden",
              opacity: 0,
              pointerEvents: "none",
              ["--title-units" as string]: String(
                Math.max(8, textUnits(proj.title.ko), textUnits(proj.title.en)),
              ),
            }}
          >
            <span className={styles.metaCategory}>
              <T ko={proj.category.ko} en={proj.category.en} />
            </span>
            <h2 className={styles.metaTitle}>
              {pickLocalized(proj.title, language).split(" ").map((word, wi) => (
                <span
                  key={wi}
                  className={styles.metaWord}
                  style={{ "--word-idx": wi } as React.CSSProperties}
                >
                  {word}
                </span>
              ))}
            </h2>
          </div>
        );
      })}

      {/* Slot 1~N — 둥근 화살표 단추. 제목 묶음 바로 아래에 붙는다(위치는 무대 훅이 맞춘다) */}
      {projects.map((proj, i) => {
        const slotIndex = i + 1;
        return (
          <div
            key={`ov-${proj.id}`}
            ref={(el) => { if (el) overlayRefs.current.set(slotIndex, el); }}
            className={styles.metaOverlay}
            style={{ visibility: "hidden", opacity: 0, pointerEvents: "none" }}
          >
            {/* 키보드는 위 목록으로 닿으므로 Tab 순서에서 뺀다 */}
            <TransitionLink
              href={workHref(proj)}
              className={styles.ctaInline}
              tabIndex={-1}
              aria-hidden="true"
              draggable={false}
              navigate={() => handleClick(i)}
              {...holdDim(slotIndex)}
            >
              <span className={styles.ctaBg} />
              <span className={styles.ctaArrow}>→</span>
            </TransitionLink>
          </div>
        );
      })}

      {/* 화면 위아래를 배경색으로 흐린다 — 멀어지며 휘는 판의 끝을 감춘다 */}
      {!bare && <div className={`${styles.fade} ${styles.fadeTop}`} aria-hidden="true" />}
      {!bare && <div className={`${styles.fade} ${styles.fadeBottom}`} aria-hidden="true" />}

      {/* 인디케이터 — 누르면 그 칸으로 돈다. 키보드는 위 작업물 목록으로 닿으므로 보조 기술에는 감춘다 */}
      {!bare && (
        <nav ref={indicatorRef} className={styles.indicator} aria-hidden="true">
          <ul className={styles.indicatorList}>
            {Array.from({ length: slotCount }, (_, i) => (
              <li key={i}>
                <Pressable
                  data-indicator-item=""
                  className={`${styles.indicatorDot} ${i === 0 ? styles.indicatorDotActive : ""}`}
                  tabIndex={-1}
                  soundDisabled
                  noTapScale
                  onClick={() => rotateTo(i)}
                />
              </li>
            ))}
          </ul>
          <span ref={indicatorFrameRef} className={styles.indicatorFrame} />
        </nav>
      )}

      {/* 좌하단 */}
      <AvailableCta />
    </div>
  );
}

/**
 * 좌하단 "Available for work" — 참고 사이트(andreasantonsson.dev)처럼 이메일 복사 단추다.
 *
 * 두 줄이 저마다 한 줄 높이의 창(mask)에 담겨 있고, 창 안에는 줄이 하나씩 더 숨어 있다. 올리면 두 줄이
 * 조금씩 어긋나며(0.1초) 위로 밀려 "Copy to clipboard"와 이메일 주소가 드러나고, 누르면 이메일을 복사하고
 * 윗줄이 "Copied"로 한 번 더 밀린다. 복사 표시는 손을 떼거나 조금 지나면 돌아온다.
 * 윗줄은 마우스를 올려야 보이는 자리라(터치 화면에서는 누르는 순간 손가락에 가린다) 알림(토스트)으로도 알린다.
 * 이메일은 사이트 설정의 연락처(푸터·개인정보 화면과 같은 값)다. 비어 있으면 누를 것이 없어 글자만 둔다.
 */
function AvailableCta() {
  const { t } = useLanguage();
  const email = useSiteConfig().contact.email.trim();
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(resetTimer.current), []);
  /* 지금 달(한국 시간). 캐시된 HTML 이 달을 넘기면 서버가 그린 달과 브라우저의 달이 다를 수 있어 비교를 끈다(#927) */
  const month = new Date().toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: SITE_TIME_ZONE });

  if (!email) {
    return (
      <div className={styles.fixedInfo}>
        <span className={styles.availableCta}>
          <span>Available for work</span>
          <span suppressHydrationWarning>{month} ↗</span>
        </span>
      </div>
    );
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(email);
    } catch {
      /* 복사를 막는 창(권한·오래된 브라우저)에서는 메일 앱으로 넘긴다 */
      window.location.href = `mailto:${email}`;
      return;
    }
    setCopied(true);
    showToast(t("worksPage.emailCopied"), "success");
    window.clearTimeout(resetTimer.current);
    resetTimer.current = window.setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className={styles.fixedInfo}>
      <Pressable
        className={styles.availableCta}
        onClick={copy}
        onPointerLeave={() => setCopied(false)}
        aria-label={`Available for work: ${month}. Click to copy email to clipboard: ${email}`}
        noTapScale
      >
        <span className={styles.ctaMask} aria-hidden>
          <span>Available for work</span>
          <span className={`${styles.ctaCopyLabel} ${copied ? styles.ctaCopied : ""}`}>
            <span>Copy to clipboard</span>
            <span>Copied</span>
          </span>
        </span>
        <span className={styles.ctaMask} aria-hidden>
          <span suppressHydrationWarning>{month} ↗</span>
          <span>{email}</span>
        </span>
      </Pressable>
    </div>
  );
}
