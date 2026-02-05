import { motion, MotionValue } from "framer-motion";
import { thisYear } from "@/utils";
import { useScrollAnimation } from "@/hooks/useRevertAnimation";
import {
  staggerContainer,
  perspectiveDepth,
  flipFromSide,
  lineGrowth,
  fadeInUp,
  playfulRotateHover,
  playfulRotateHoverReverse,
  textLiftHover,
  perspectiveTiltHover,
  SPRING,
} from "@/animations";
import styles from "./SkillsHeader.module.css";

/**
 * Transition configurations for each element
 */
const TRANSITIONS = {
  line: {
    duration: 1.2,
    delay: 0.5,
  },
  titleTechstack: {
    duration: 1,
    delay: 0.3,
  },
  titleBeyond: {
    duration: 1,
    delay: 0.7,
  },
  subtitle: {
    duration: 0.8,
    delay: 1.2,
  },
  issueHover: SPRING.medium,
} as const;

export default function SkillsHeader() {
  const { ref, inView, opacity, y, width } = useScrollAnimation({
    reverseStart: 0.6,
    reverseEnd: 0.8,
  });

  return (
    <motion.header
      ref={ref}
      className={styles.editorialHeader}
      variants={staggerContainer}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
    >
      <HeaderLeft />

      <MainTitle
        inView={inView}
        opacity={opacity}
        y={y}
        underlineWidth={width}
      />

      <Subtitle inView={inView} />
    </motion.header>
  );
}

/**
 * Header left section (Issue, Line, Date)
 */
function HeaderLeft() {
  return (
    <motion.div className={styles.headerLeft} variants={perspectiveDepth}>
      <motion.span
        className={styles.issueNumber}
        whileHover={playfulRotateHover}
        transition={TRANSITIONS.issueHover}
      >
        ISSUE 03
      </motion.span>

      <motion.div
        className={styles.headerLine}
        variants={lineGrowth}
        transition={TRANSITIONS.line}
        style={{ "--line-height": "120px" } as React.CSSProperties}
      />

      <motion.span
        className={styles.date}
        variants={perspectiveDepth}
        whileHover={playfulRotateHoverReverse}
      >
        {thisYear}
      </motion.span>
    </motion.div>
  );
}

/**
 * Main title section
 */
interface MainTitleProps {
  inView: boolean;
  opacity: MotionValue<number>;
  y: MotionValue<number>;
  underlineWidth: MotionValue<string>;
}

function MainTitle({ inView, opacity, y, underlineWidth }: MainTitleProps) {
  return (
    <motion.h2 className={styles.mainTitle} style={{ opacity, y }}>
      <motion.span
        className={styles.titleLine}
        variants={perspectiveDepth}
        initial="hidden"
        animate={inView ? "visible" : "hidden"}
        transition={TRANSITIONS.titleTechstack}
        whileHover={textLiftHover}
      >
        TECHSTACK
      </motion.span>

      <motion.span
        className={styles.titleLine}
        variants={flipFromSide}
        initial="hidden"
        animate={inView ? "visible" : "hidden"}
        transition={TRANSITIONS.titleBeyond}
        whileHover={perspectiveTiltHover}
      >
        & BEYOND
        <motion.div
          className={styles.underline}
          style={{
            width: underlineWidth,
            opacity: 1,
          }}
        />
      </motion.span>
    </motion.h2>
  );
}

/**
 * Subtitle section
 */
interface SubtitleProps {
  inView: boolean;
}

function Subtitle({ inView }: SubtitleProps) {
  return (
    <motion.p
      className={styles.subtitle}
      variants={fadeInUp}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      transition={TRANSITIONS.subtitle}
    >
      현대적인 웹 개발 기술과 도구들을 활용하여 사용자 중심의 경험을 만드는 것을
      좋아합니다.
    </motion.p>
  );
}
