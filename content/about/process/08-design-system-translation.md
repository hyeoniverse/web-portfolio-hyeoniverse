---
step: 08
start: 2026-09-29
end: 2026-10-12
commits: 487
prs: 190
weekly: 381 106
mix: feat:73 fix:96 design:62 refactor:77 perf:3 etc:176
metric: 2 → 33
metric_label: 방문자가 고를 수 있는 언어
---

# 디자인 시스템 · 번역 · 운영 기록

디자인 시스템을 웹 플랫폼 기능으로 옮겼습니다. CSS 를 **cascade layer** 일곱 층으로 나누고, 테마는 `light-dark()` 와 View Transitions 로, 모달 · 메뉴는 `<dialog>` · popover 로 top layer 에 올렸으며, 화면 규칙을 작은 화면 기본으로 뒤집고 `!important` 를 걷어 냈습니다. 결정은 이유와 함께 **70개** 항목으로 남겼습니다.

방문자는 메뉴의 🌐 단추로 사이트 전체를 **33개 언어** 중 하나로 바꿔 볼 수 있고, 원문을 고치면 자동 번역이 다시 만들어집니다. AI · 메일 · GitHub 호출의 성공과 실패를 서비스 기록에 남겼고, 방문 · 조회 기록은 `page_views` 하나로 합쳐 방문자 · 방문 흐름 · 머문 시간을 같은 기준으로 셉니다.
