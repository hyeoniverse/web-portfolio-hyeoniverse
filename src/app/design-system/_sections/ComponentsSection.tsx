"use client";

import { memo } from "react";
import styles from "../DesignSystem.module.css";
import { DemoProvider, type DemoProps } from "./components/demoShared";
import LayoutBrandDemos from "./components/LayoutBrandDemos";
import ButtonsActionsDemos from "./components/ButtonsActionsDemos";
import TogglesSelectionDemos from "./components/TogglesSelectionDemos";
import InputsFieldsDemos from "./components/InputsFieldsDemos";
import PickersSelectsDemos from "./components/PickersSelectsDemos";
import ChipsDemos from "./components/ChipsDemos";
import OverlaysPopoversDemos from "./components/OverlaysPopoversDemos";
import FeedbackDisplayDemos from "./components/FeedbackDisplayDemos";

interface ComponentsSectionProps extends DemoProps {
  setSectionRef: (id: string) => (el: HTMLElement | null) => void;
}

/**
 * 공용 컴포넌트 시연 구역.
 *
 * 시연은 눌러 볼 수 있어야 하므로 묶음마다 시연용 상태가 필요하다. 그 상태는 각 묶음
 * 파일이 스스로 들고 있고, 여기서는 순서대로 늘어놓기만 한다. 언어와 등장 애니메이션
 * 설정만 공통이라 DemoProvider 로 내려보낸다.
 */
function ComponentsSection({ setSectionRef, ...demo }: ComponentsSectionProps) {
  return (
    <section id="components" ref={setSectionRef("components")} className={styles.section}>
      <h2 className={styles.sectionTitle}>Components</h2>

      <DemoProvider value={demo}>
        <LayoutBrandDemos />
        <ButtonsActionsDemos />
        <TogglesSelectionDemos />
        <InputsFieldsDemos />
        <PickersSelectsDemos />
        <ChipsDemos />
        <OverlaysPopoversDemos />
        <FeedbackDisplayDemos />
      </DemoProvider>
    </section>
  );
}

export default memo(ComponentsSection);
