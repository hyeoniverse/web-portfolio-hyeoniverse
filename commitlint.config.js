module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // 타입 규칙
    'type-enum': [
      2,
      'always',
      [
        'feat',     // 새로운 기능
        'fix',      // 버그 수정
        'design',   // 레이아웃·스타일 조정 (기능 변경 없음)
        'docs',     // 문서 수정
        'style',    // 코드 포맷팅
        'refactor', // 리팩토링
        'perf',     // 성능 개선
        'test',     // 테스트
        'chore',    // 빌드, 설정
        'ci',       // CI/CD
        'revert',   // 되돌리기
      ],
    ],
    'type-case': [2, 'always', 'lower-case'],
    'type-empty': [2, 'never'],

    // 범위 규칙
    'scope-case': [2, 'always', 'lower-case'],

    // 제목 규칙
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'subject-max-length': [2, 'always', 72],
    'subject-case': [0], // 한글 및 고유명사 허용

    // 헤더 규칙
    'header-max-length': [2, 'always', 100],

    // 본문 규칙
    'body-max-line-length': [1, 'always', 100],
  },
};
