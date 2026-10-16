import StarLog from "./_components/StarLog";
import styles from "./PostsLayout.module.css";

/* 블로그(/posts 아래 모든 화면) 공통 바탕 — 몽이 · 별 테마. data-blog-skin="log" 가 카드 날짜 줄 · 태그의 로그 스킨을 켜고,
   별밭(StarLog)이 페이지 전체 길이를 덮는다. 화면마다 따로 깔던 것을 여기 한 곳으로 모았다 */
export default function PostsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.skin} data-blog-skin="log">
      <StarLog seed="Log" />
      {children}
    </div>
  );
}
