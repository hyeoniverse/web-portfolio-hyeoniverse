"use client";

import { useState, useEffect, useCallback, useRef, type RefObject } from "react";

/**
 * 로딩 화면의 큰 로고와 네비게이션의 작은 로고를 겹쳐 보이게 하는 값을 잰다.
 *
 * 로딩이 끝나면 큰 로고가 네비게이션 자리로 줄어들며 이동하는 연출이 있다. 그러려면
 * 두 글자 크기의 비율과, 화면 한가운데에서 네비게이션 로고까지의 거리가 필요하다.
 * 비율은 로딩 화면에서 쓰는 글자 크기를 임시 요소에 적용해 실제 픽셀값을 읽어 구한다.
 *
 * @param logoRef 네비게이션 로고 요소
 * @param showLoadingLogo 로딩 화면이 떠 있는 동안만 잰다
 * @param isLoading 로딩이 끝나면 다음을 위해 잰 값을 버린다
 */
export function useLogoMeasure(
  logoRef: RefObject<HTMLElement | null>,
  showLoadingLogo: boolean,
  isLoading: boolean,
) {
  const [centerOffset, setCenterOffset] = useState({ x: 0, y: 0 });
  const [scaleFactor, setScaleFactor] = useState(1);
  const hasMeasured = useRef(false);

  const [logoMeasured, setLogoMeasured] = useState(false);

  const measureLogo = useCallback(() => {
    const el = logoRef.current;
    if (!el) return;

    // 스케일 비율 먼저 계산 (오프셋 계산에 필요)
    const tempEl = document.createElement("span");
    tempEl.style.cssText =
      "font-size:var(--fluid-font-size-6xl);position:absolute;visibility:hidden;";
    tempEl.textContent = "H";
    document.body.appendChild(tempEl);
    const loadingFontSize = parseFloat(getComputedStyle(tempEl).fontSize);
    document.body.removeChild(tempEl);

    const navFontSize = parseFloat(getComputedStyle(el).fontSize);
    const scale = navFontSize > 0 ? loadingFontSize / navFontSize : 1;
    setScaleFactor(scale);

    // transformOrigin: "left center" 기준 → 스케일된 너비를 반영한 중앙 오프셋
    const rect = el.getBoundingClientRect();
    setCenterOffset({
      x: window.innerWidth / 2 - rect.left - (rect.width * scale) / 2,
      y: window.innerHeight / 2 - (rect.top + rect.height / 2),
    });
    setLogoMeasured(true);
    // logoRef 는 인자로 받는 ref 객체다. 신원이 바뀌지 않으므로 넣어도 다시 만들어지지 않는다.
  }, [logoRef]);

  useEffect(() => {
    if (!showLoadingLogo || hasMeasured.current || !logoRef.current) return;
    hasMeasured.current = true;
    requestAnimationFrame(measureLogo);
  }, [showLoadingLogo, measureLogo, logoRef]);

  // 로딩이 완전히 끝나면 다음 로딩을 위해 측정 플래그 리셋
  useEffect(() => {
    if (!isLoading) {
      hasMeasured.current = false;
      setLogoMeasured(false);
    }
  }, [isLoading]);

  return { centerOffset, scaleFactor, logoMeasured };
}
