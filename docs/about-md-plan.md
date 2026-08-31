# About 콘텐츠를 md 로 — 구현 계획

**About 페이지의 내용을 설정 화면에서 고치는 지금 방식에 더해, `content/about/` 의 마크다운
파일에서도 가져올 수 있게 한다.** 패널별로 어느 쪽을 원본으로 삼을지 설정에서 고른다.

이 문서는 착수 전 계획이다. 실행하면서 확정된 형식(파일 배치·frontmatter 키)은
`docs/md-about-guide.md` 로 따로 남긴다 — posts·works 가이드와 같은 자리.

> **진행 상황** (이슈 [#609](https://github.com/hyeoniverse/web-portfolio-oval/issues/609))
> **1~6단계 완료.** 쓰는 법은 [md-about-guide.md](md-about-guide.md) 로 옮겼다.
>
> 계획과 달라진 것 두 가지.
> - **이미지 매니페스트를 만들지 않았다.** md 경로 치환은 파일 존재 확인만으로 충분했고,
>   남은 소비자인 이미지 선택기는 `/api/admin/project-images` 로 그 자리에서 훑는 편이
>   단순했다 — 생성 파일을 커밋하고 이미지가 바뀔 때마다 갱신하는 손이 없다.
> - **패널 일괄 내보내기 버튼을 만들지 않았다.** 브라우저는 repo 에 파일을 쓸 수 없어
>   18개를 다운로드 폴더에 받아 손으로 옮겨야 한다. `npm run sync-about:eject` 한 줄이 낫다.
>
> `contentSource` 는 비어 있다(전부 화면 편집). 파일은 준비돼 있으니 설정 화면에서 켜면 된다.

---

## 0. 결론부터

가능하다. 새로 만드는 게 아니라 **이미 있는 경로에 얹는 일**이다.

`content/posts/` · `content/works/` 와 [`scripts/sync-posts.ts`](../scripts/sync-posts.ts) ·
[`scripts/sync-works.ts`](../scripts/sync-works.ts) 가 이미 Jekyll 방식으로 돌고 있다.
About 도 `content/about/` + `scripts/sync-about.ts` 로 같은 모양을 따른다.

---

## 1. 어디에 끼우나

About 패널 15개가 전부 같은 모양이다.

```ts
const cfg = useSiteConfig();
const items = cfg.about.troubleshooting?.length ? cfg.about.troubleshooting : troubleShootingItems;
```

`cfg` 는 [`layout.tsx:116`](../src/app/layout.tsx) 에서 `getSiteConfig()` 로 채워지고,
그건 `site_settings` 한 행을 정적 기본값에 merge 한 것이다.
**동기화 스크립트가 같은 자리에 쓰면 패널도 프로바이더도 한 줄 안 고친다.**

### 런타임에 fs 로 읽지 않는 이유

`getSiteConfig()` 는 캐시 없이 요청마다 두 번 불린다
([`layout.tsx:30`](../src/app/layout.tsx) 의 generateMetadata, 그리고 layout 본체).
여기에 파일 스캔 + 파싱을 얹으면 그 비용이 그대로 두 배가 된다. Vercel 배포에서 소스 파일
접근도 보장되지 않는다. 빌드 때 한 번 밀어넣는 편이 싸고 확실하다.

> `getSiteConfig` 를 `React.cache` 로 감싸는 건 이 기능과 별개로 지금 해도 되는 일이다.

---

## 2. 두 출처를 어떻게 가르나

> **실행 결과 — 계획과 달라졌다.** 처음에는 패널별로 `about.contentSource` 에 `ui` / `markdown`
> 을 적어 사람이 고르게 했다. 써 보니 스위치 자체가 군더더기였다. 켜 놓고 동기화를 안 돌리면
> 아무 일도 안 일어나면서 편집만 잠기고, 파일을 고칠 때마다 어느 쪽이 켜져 있는지 기억해야 했다.
>
> 지금은 **둘 다 원본**이고 동기화가 시각을 견줘 더 최근 쪽을 남긴다.
> `about.contentEditedAt`(화면 저장 시각)과 파일 mtime 을 패널마다 비교한다.
> `sync-posts` 가 mtime 과 `updated_at` 을 견주는 것과 같은 규칙이라 새로 만든 개념도 아니다.

UI 편집과 md 가 같은 키를 쓴다. 중재자가 없으면 동기화가 UI 편집을 덮거나, 반대가 된다.
그래서 패널마다 두 시각을 남긴다.

```ts
about.contentEditedAt: Record<string, string>   // 화면에서 저장한 시각
about.contentSyncedAt: Record<string, string>   // md 에서 가져온 시각
```

동기화는 파일이 더 최근인 패널만 쓴다. 화면에서 방금 고친 내용을 오래된 파일이 덮지 않는다.

## 3. 어느 패널이 md 로 표현되나

전부는 안 된다. 데이터 형태로 갈린다.

| | 패널 | 비고 |
| --- | --- | --- |
| 된다 | Design Decisions · Security · Features · Process · Overview · Credits | 제목 + 산문 + 목록 |
| 중첩 필요 | Code Highlights · Design System · Tech Stack · Backend | `endpoints[]` · `columns[]` 가 중첩 배열 |
| 안 된다 | ERD · User Flow · Architecture 다이어그램 · Hero 영상 | 그래프·좌표 데이터. UI 전용으로 남긴다 |

안 되는 걸 억지로 md 에 넣으면 지금 편집기보다 나빠진다.

---

## 4. 파일 배치

`docs/` 가 이미 `security.md` / `security.en.md` 로 언어를 나눈다. About 의 모든 텍스트가
`LocalizedText {ko, en}` 이라 한 쌍이 한 항목이 된다.

```
content/about/decisions/
  01-role-stored-in-app-metadata.md
  01-role-stored-in-app-metadata.en.md
  01-role-stored-in-app-metadata/
    permission-storage-flow.svg
```

파일명 앞 번호가 표시 순서, 나머지가 항목 id.

```md
---
id: role-stored-in-app-metadata
section: 인증 / 인가
difficulty: 2
tags: [auth, jwt, rls]
---
# 권한 데이터의 신뢰 경계 설계

## Context
...
## Considerations
...
## Decision
...
## Key Insight
...
```

이건 Design Decisions 패널의 **md 내보내기 버튼이 이미 뱉는 형식 그대로다**
([`troubleshootingMarkdown.ts`](../src/app/about/_components/panels/troubleshootingMarkdown.ts)).
뽑아서 `content/about/decisions/` 에 넣고 동기화하면 돌아온다. UI → md 이주가
클릭 한 번 + 명령 한 번이 된다. 패널 단위 일괄 내보내기 버튼만 추가하면 된다.

### frontmatter 파서

[`sync-posts.ts:61`](../scripts/sync-posts.ts) 에 있는 건 평면 키와 `[a, b]` 배열만 다룬다.
1단계 대상은 그걸로 충분하니 `scripts/lib/frontmatter.ts` 로 빼서 셋이 공유한다.
중첩이 필요한 Backend 단계에 가서 `yaml` 을 붙일지 정한다 — 미리 넣지 않는다.

---

## 5. 이미지

**주인이 하나면 그 옆에, 여럿이면 `public/images/`, 업로드면 storage.**

지금 `public/images/about/decisions/01_permission_storage_decision_flow.svg` 파일 하나가
있는데, 이름 앞의 `01_` 이 증상이다. 항목과 묶여 있다는 걸 파일명으로 표시할 수밖에 없었고,
순서가 바뀌면 그 이름은 거짓말이 된다.

| 종류 | 자리 | 이유 |
| --- | --- | --- |
| 항목 하나만 쓰는 이미지 | `content/about/<패널>/<항목>/` | 항목과 함께 이동·삭제된다. PR diff 에 본문과 같이 뜬다. 상대 경로라 VS Code 프리뷰가 된다 |
| 여러 곳이 공유 | `public/images/` 그대로 | `images/screenshots/` 98개는 `features.ts`(9) · `troubleshooting.ts`(5) · `site.config.ts`(8) 가 같이 참조한다. 주인이 여럿이라 어디에도 co-locate 못 한다 |
| UI 에서 업로드 | Supabase storage 그대로 | git 밖에 있는 게 맞다 |

Next 는 `content/` 를 서빙하지 않으므로 prebuild 에서 `public/content/` 로 복사하고,
동기화가 상대 경로를 `/content/about/decisions/01-.../foo.svg` 로 바꿔 DB 에 쓴다.
`prebuild` 는 이미 있다(`node scripts/scan-fonts.mjs`). 경로가 `public/` 아래로 떨어지므로
`next/image` 최적화도 그대로 받는다.

라우트 핸들러로 복사를 없애는 안도 검토했으나, Vercel 에서 `content/` 를 서버 번들에
포함시키는 설정(`outputFileTracingIncludes`)이 추가로 필요하고 이미지가 CDN 을 못 타서 접었다.

### 치를 값

- `public/content/` 는 생성물이라 `.gitignore` 에 넣는다(`/public/intro-bg.mp4` 선례).
- 복사는 **삭제분까지 정리(prune)** 해야 한다. 안 그러면 md 에서 지운 이미지가 `public/` 에
  남아 배포에 실려 간다.
- `next dev` 는 prebuild 를 안 탄다. `dev` 스크립트에도 복사를 붙인다.

### 이미지 자동 인식

`scripts/gen-image-manifest.ts` 가 `public/images/**` 를 훑어
`src/data/generated/aboutImages.ts` 를 만든다(prebuild). 이 매니페스트로

- md 의 상대 경로를 풀고, 없는 파일을 참조하면 동기화를 실패시킨다
- [`CoverImagePicker`](../src/components/posts/CoverImagePicker/index.tsx) 에 "프로젝트 이미지"
  탭을 추가한다. 지금 탭이 presets/unsplash/pexels/ai/history 라 로컬 이미지를 고를 길이 없다

---

## 6. 단계

1. **바탕** — frontmatter 파서 추출, `about.contentSource` 필드, `scripts/sync-about.ts`
   뼈대(`--dry` 포함), 이미지 복사 + 매니페스트
2. **Design Decisions 하나로 끝까지** — 9개 항목을 md 로 뽑아 넣고 왕복 확인
3. **산문형 확대** — Security · Features · Process · Overview · Credits
4. **설정 UI** — 패널별 원본 전환, md 패널 잠금, 경로·시각 표시, 패널 일괄 내보내기
5. **이미지 탭** — CoverImagePicker
6. **문서** — `docs/md-about-guide.md`

**2단계까지가 실제 검증점이다.** 거기서 형식이 안 맞으면 이후가 전부 흔들린다.

---

## 7. 위험한 부분

### 한 행에 쓰는 사람이 둘 — 가장 큰 것

`site_settings` 는 한 행짜리 jsonb 이고 저장 형식이 `{ delta, savedDefaults }` 다.
동기화가 config 를 통째로 갈아끼우면 About 과 무관한 설정까지 날아간다.

설정 화면이 섹션 저장에 쓰는 경로 단위 델타 방식
([`settingsConstants.ts:169`](<../src/app/admin/(dashboard)/settings/_data/settingsConstants.ts>) 의
`computeDelta`)을 동기화도 똑같이 써야 한다. 지금 이 헬퍼들이 admin 화면 폴더 안에 있으니
`src/lib/settingsDelta.ts` 로 빼서 스크립트·설정 화면·API 가 공유하는 게 **먼저다.**

### merge 가 배열을 통째로 교체한다

[`getSiteConfig.ts`](../src/lib/getSiteConfig.ts) 의 `deepMerge` 는 배열을 병합하지 않고
갈아끼운다. 이 기능에는 맞는 동작이지만, 한 패널을 md 와 UI 로 반씩 채우는 건 불가능하다는
뜻이다. 원본은 패널 단위로만 가를 수 있다.

### 검증 — 완료

[`validateAboutContent.ts`](../src/lib/api/validateAboutContent.ts) 를 두고 동기화
스크립트와 `/api/admin/settings` PATCH 가 같이 쓴다. 막는 것은 **없으면 화면이 죽는 값**이다
— 패널이 `item.cause[language]` 처럼 바로 파고들어서, 빠지면 빈 칸이 아니라 TypeError 다.
없어도 빈 칸으로 끝나는 값은 막지 않는다. 촘촘할수록 정상적인 편집이 걸린다.

동기화는 그에 더해 **파서 경고가 하나라도 있으면 쓰지 않고 멈춘다.**

### 삭제는 하지 않는다

폴더가 비면 DB 값을 지우는 게 아니라 경고만 낸다. `sync-posts` 와 같은 규칙.
