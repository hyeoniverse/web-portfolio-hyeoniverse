/* 리더 부가 렌더가 공유하는 컨텍스트.
   기능마다 파일이 나뉘어 있지만 정리(cleanup)와 취소 판정은 하나로 묶여야 한다 —
   컴포넌트가 언마운트되면 진행 중인 fetch 결과를 DOM 에 반영하면 안 되고,
   붙여둔 리스너·옵저버는 전부 떼야 한다. */
export interface ReaderExtrasLabels {
  viewCode: string;
  hideCode: string;
  copyCode: string;
  copied: string;
  diagram: string;
  code: string;
  split: string;
}

export interface ReaderExtrasContext {
  /** 후처리 대상 컨테이너 (dangerouslySetInnerHTML 로 그려진 DOM) */
  el: HTMLElement;
  labels: ReaderExtrasLabels;
  /** 언마운트 때 실행할 정리 함수를 여기 넣는다 */
  cleanups: Array<() => void>;
  /** 비동기 작업이 DOM 을 만지기 전에 확인한다 */
  isCancelled: () => boolean;
}
