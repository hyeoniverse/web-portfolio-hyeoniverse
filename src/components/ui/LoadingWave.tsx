import styles from "./LoadingWave.module.css";

interface LoadingWaveProps {
  /** wave 로 띄울 텍스트. 글자별로 분해 후 순차 bob. */
  text: string;
  /** 글자 간 delay (초). 기본 0.05s. */
  charDelay?: number;
  className?: string;
}

/** 텍스트 글자가 순차 wave 로 출렁이는 로딩 인디케이터.
 *  텍스트 자체가 indicator 라 button width 가 보존됨 (LoadingDots 와 달리 크기 변형 X). */
export default function LoadingWave({ text, charDelay = 0.05, className }: LoadingWaveProps) {
  return (
    <span className={`${styles.wave}${className ? ` ${className}` : ""}`}>
      {text.split("").map((char, i) => (
        <span
          key={i}
          className={styles.waveChar}
          style={{ animationDelay: `${i * charDelay}s` }}
        >
          {char === " " ? " " : char}
        </span>
      ))}
    </span>
  );
}
