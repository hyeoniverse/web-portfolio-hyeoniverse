"use client";

import { motion } from "framer-motion";
import Button from "@/components/ui/Button";
import Collapsible from "@/components/ui/Collapsible";
import SectionHeader from "@/components/ui/SectionHeader";
import Logo from "@/components/common/Logo";
import { staggerItemX } from "../../_data/animations";
import styles from "../../DesignSystem.module.css";
import { DemoGroup, useDemo } from "./demoShared";

/** Layout & Brand — 공용 컴포넌트 시연. 이 묶음에서만 쓰는 시연용 상태를 스스로 들고 있다. */
export default function LayoutBrandDemos() {
  const { language, scrollChildX } = useDemo();


  return (
    <>
        <h3 className={styles.componentCategory}>Layout & Brand</h3>

        {/* Logo */}
        <DemoGroup title="Logo">
          <div className={styles.logoRow}>
            <motion.div className={styles.logoItem} variants={staggerItemX} {...scrollChildX(0, 2)}>
              <Logo variant="short" as="span" />
              <span className={styles.logoLabel}>short</span>
            </motion.div>
            <motion.div className={styles.logoItem} variants={staggerItemX} {...scrollChildX(1, 2)}>
              <Logo variant="full" as="span" />
              <span className={styles.logoLabel}>full</span>
            </motion.div>
          </div>
        </DemoGroup>

        {/* SectionHeader */}
        <DemoGroup
          title="SectionHeader"
          ko={"제목과 선택적 부가설명, 선택적 우측 액션 슬롯으로 구성됩니다. 여러 곳에 흩어져 있던 `<h2>제목</h2> + <p>부가설명</p>` 인라인 패턴을 흡수합니다. 저장/되돌리기와 dirty 계산이 결합된 admin 설정의 SectionHeader 와 달리, 이 컴포넌트는 프레젠테이션 전용입니다."}
          en={"Title + optional sub + optional right-side action slot. Absorbs the scattered inline `<h2>` + `<p>` pattern. Presentation-only — unlike the settings `SectionHeader` which is coupled to save/dirty logic."}
        >
          <motion.div variants={staggerItemX} {...scrollChildX(0, 1)} style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-xl)", width: "100%", maxWidth: 520 }}>
            <SectionHeader
              title={language === "ko" ? "섹션 제목" : "Section title"}
              sub={language === "ko" ? "제목 아래 부가설명이 들어갑니다." : "A subtitle sits below the title."}
            />
            <SectionHeader
              title={language === "ko" ? "액션 있는 헤더" : "With actions"}
              sub={language === "ko" ? "우측에 버튼 슬롯이 붙습니다." : "A button slot on the right."}
              actions={<Button variant="outline" size="sm">{language === "ko" ? "액션" : "Action"}</Button>}
            />
          </motion.div>
        </DemoGroup>

        {/* Collapsible */}
        <DemoGroup
          title="Collapsible"
          ko={"내용이 maxHeight 를 넘을 때만 접고 더보기를 붙입니다. 넘치지 않으면 버튼도 페이드도 없어서 짧은 내용에는 흔적이 남지 않습니다. 높이는 ResizeObserver 로 추적합니다. 마크다운 이미지는 늦게 로드돼 그때 높이가 바뀌는데, 한 번만 재면 \"로드 전 = 안 넘침\" 상태로 굳어 긴 댓글이 접히지 않기 때문입니다. 첫 클램프에는 애니메이션을 걸지 않아, 글이 저절로 접히는 듯한 연출을 피합니다."}
          en={"Clamps and adds a show-more only when the content exceeds maxHeight — no button, no fade otherwise, so short content shows no trace of it. Height is tracked with a ResizeObserver: markdown images load late and change the height, and measuring once would freeze \"not overflowing\" from before the load, leaving long comments unclamped. The first clamp skips the animation so posts don't appear to fold themselves up."}
        >
          <motion.div className={styles.collapsibleDemo} variants={staggerItemX} {...scrollChildX(0, 1)}>
            <Collapsible
              maxHeight={140}
              expandLabel={language === "ko" ? "더보기" : "Show more"}
              collapseLabel={language === "ko" ? "접기" : "Show less"}
            >
              <div className={styles.collapsibleBody}>
                <p>
                  {language === "ko"
                    ? "이 문단은 maxHeight(140px)보다 길어서 접힙니다. 잘린 아래쪽 페이드가 \"여기서 끝이 아니다\"를 알리는 유일한 시각 단서입니다 — 버튼만 있으면 딱 잘린 글자 줄이 그냥 마지막 줄처럼 읽힙니다."
                    : "This block is taller than maxHeight (140px), so it clamps. The fade at the cut is the only cue that there's more below — with just a button, the clipped line reads as the last line."}
                </p>
                <p>
                  {language === "ko"
                    ? "클램프는 바깥(.clip)이 하고 측정은 안쪽(.inner)이 합니다. 같은 요소가 둘 다 하면 max-height 에 눌린 높이를 재게 되어 항상 \"딱 맞음\"이 나옵니다."
                    : "The outer element (.clip) does the clamping while an inner one measures. If one element did both, it would measure the height already squashed by max-height and always report \"fits\"."}
                </p>
                <p>
                  {language === "ko"
                    ? "펼친 뒤 높이는 실제로 auto 입니다 — framer-motion 이 height: \"auto\" 를 실측해 애니메이트하기 때문에, 나중에 이미지가 더 로드돼 내용이 길어져도 잘리지 않습니다."
                    : "Once expanded the height is genuinely auto — framer-motion measures height: \"auto\" to animate it, so late-loading images can grow the content without it getting cut off."}
                </p>
                <p>
                  {language === "ko"
                    ? "chevron 회전 transition 은 .root .chevron 처럼 compound 셀렉터로 씁니다. 전역 theme transition(html[data-theme-ready] *)이 shorthand 라 단일 클래스로는 transform transition 이 통째로 덮어써집니다."
                    : "The chevron's rotation transition uses a compound selector (.root .chevron). The global theme transition (html[data-theme-ready] *) is a shorthand, so a single-class selector would have its transform transition wiped out entirely."}
                </p>
              </div>
            </Collapsible>
          </motion.div>
        </DemoGroup>

    </>
  );
}
