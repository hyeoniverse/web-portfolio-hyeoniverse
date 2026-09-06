import styles from "../AdminPosts.module.css";

/** 마크다운 올리기 도움말 — 정적 문서. 화면 상태와 무관하다. */
export default function MarkdownUploadGuide() {
  return (
    <div className={styles.uploadGuide}>
      <h4>기본 사용법</h4>
      <p><code>.md</code> 파일을 선택하면 각 파일이 <strong>비공개 초안</strong>으로 생성됩니다. 여러 파일을 한번에 선택할 수 있습니다.</p>
      <ul>
        <li>파일명이 포스트 제목으로 사용됩니다 (확장자 제외)</li>
        <li>파일 내용이 마크다운 콘텐츠로 들어갑니다</li>
        <li>발행 상태는 <strong>비공개(draft)</strong>로 설정됩니다</li>
      </ul>

      <h4>Frontmatter</h4>
      <p>파일 상단에 YAML frontmatter를 작성하면 메타데이터가 자동 반영됩니다.</p>
      <p className={styles.uploadGuideNote}>발행하려면 <strong>제목 · 슬러그 · 카테고리 · 본문</strong>이 필요합니다. 초안은 제목만 있어도 생성되고, 나머지는 에디터에서 채우면 됩니다.</p>
      <table>
        <thead><tr><th>필드</th><th>타입</th><th>설명</th><th>기본값</th></tr></thead>
        <tbody>
          <tr><td><code>title</code></td><td>string</td><td>포스트 제목</td><td>파일명</td></tr>
          <tr><td><code>slug</code></td><td>string</td><td>URL 슬러그</td><td>제목에서 자동 생성</td></tr>
          <tr><td><code>category</code></td><td>string</td><td>카테고리 — 2단계 중 <strong>소분류</strong>(대분류는 자동 도출)</td><td>기타</td></tr>
          <tr><td><code>tags</code></td><td>string[]</td><td>태그 목록 (예: [React, Next.js])</td><td>없음</td></tr>
          <tr><td><code>excerpt</code></td><td>string</td><td>요약/발췌문</td><td>없음</td></tr>
          <tr><td><code>excerpt_en</code></td><td>string</td><td>영문 요약</td><td>없음</td></tr>
          <tr><td><code>title_en</code></td><td>string</td><td>영문 제목</td><td>없음</td></tr>
          <tr><td><code>language</code></td><td>ko | en</td><td>기본 언어</td><td>ko</td></tr>
          <tr><td><code>icon</code></td><td>string</td><td>페이지 아이콘 (이모지 또는 이미지 URL)</td><td>없음</td></tr>
          <tr><td><code>github_url</code></td><td>string</td><td>연결할 GitHub URL</td><td>없음</td></tr>
          <tr><td><code>pinned</code></td><td>boolean</td><td>상단 고정 (true/false)</td><td>false</td></tr>
          <tr><td><code>cover_image</code></td><td>string</td><td>커버 이미지 URL</td><td>없음</td></tr>
          <tr><td><code>cover_position</code></td><td>number</td><td>커버 세로 위치 % (0~100)</td><td>50</td></tr>
          <tr><td><code>cover_zoom</code></td><td>number</td><td>커버 확대 배율 (1~2.5)</td><td>1</td></tr>
          <tr><td><code>date</code></td><td>string</td><td>작성일 (ISO 8601 또는 YYYY-MM-DD)</td><td>업로드 시점</td></tr>
        </tbody>
      </table>

      <h4>예시 — 전체 형식</h4>
      <pre><code>{`---
    title: Next.js 15 마이그레이션 가이드
    title_en: Migrating to Next.js 15
    slug: nextjs-15-migration
    category: 개발
    tags: [Next.js, React, Migration]
    icon: 🚀
    github_url: https://github.com/me/next15-demo
    pinned: true
    date: 2024-03-15
    excerpt: Next.js 14에서 15로 마이그레이션 정리
    ---

    ## 개요

    본문 내용...`}</code></pre>

      <h4>날짜/태그 작성법</h4>
      <pre><code>{`# 날짜
    date: 2024-03-15
    date: 2024-03-15T14:30:00+09:00

    # 태그 — 배열 또는 단일
    tags: [React, Next.js, TypeScript]
    tags: React`}</code></pre>

      <h4>GitHub Pages 마이그레이션</h4>
      <p>Jekyll/Hugo 등 기존 블로그의 <code>_posts/</code> 디렉토리에서 <code>.md</code> 파일을 선택하면 <code>title</code>, <code>tags</code>, <code>categories</code> 필드가 자동 인식됩니다.</p>
      <p className={styles.uploadGuideNote}>등록되지 않은 카테고리는 생성 여부를 확인합니다. Jekyll의 layout, permalink 등 미지원 필드는 무시됩니다.</p>
    </div>
  );
}
