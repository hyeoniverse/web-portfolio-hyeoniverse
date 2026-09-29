---
title: "ChatBuddy"
title_en: "ChatBuddy"
slug: chatbuddy
subtitle: "상담이 부담스러운 청년이 친구에게 말하듯 마음을 털어놓는 AI 대화 앱"
subtitle_en: "An AI chat app where young people who find counseling daunting can open up as if talking to a friend"
category: 모바일 앱, AI / ML
category_en: Mobile App, AI / ML
nature: 공모전 / 콘테스트 / 해커톤
nature_en: Contest / Hackathon
order: 5
year: 2023
tech: [Java, Android, OpenAI API, Firebase Auth, Firebase Realtime Database, OkHttp, KKMA]
description: "우울감을 겪는 청년이 친구 같은 AI 캐릭터 츄디와 대화하며 감정을 털어놓는 Android 앱입니다. GDSC Solution Challenge 2023 에 4인 팀 ChatBud 로 참가해 만들었습니다."
description_en: "An Android app where young people struggling with low mood talk to Chuddy, a friendly AI character, to let their feelings out. Built by the four-person team ChatBud for the GDSC Solution Challenge 2023."
role: "Android 개발 · ChatGPT 대화 연동 · Firebase 인증과 기록 · 자주 쓴 단어 분석"
role_en: "Android development · ChatGPT integration · Firebase auth and history · Frequent-word analysis"
image: https://rqebkijkxkvsiyhdtvui.supabase.co/storage/v1/object/public/posts/posts/872d63e1-0d1b-4898-b5e1-58f1e4a4ee6e.png
github_url: https://github.com/hyeoniverse/CHATBuddy
---

![ChatBuddy: 마음의 짐을 털어놓을 수 있는 대화 친구 츄디](/content/works/chatbuddy/title.jpg)

## 한눈에 보기

| 항목 | 내용 |
| --- | --- |
| 기간 | 2023.01.16 ~ 2023.03.31 |
| 인원 | 4인 (팀 ChatBud) |
| 역할 | Android 앱 개발, ChatGPT 대화 연동, Firebase 인증과 대화 기록, 자주 쓴 단어 분석 |
| 기여 | 팀 저장소 커밋 57개 중 49개 |
| 대회 | GDSC Solution Challenge 2023 (UN 지속가능발전목표: 건강과 웰빙, 평화와 정의) |
| 시연 | [시연 영상 (YouTube)](https://www.youtube.com/watch?v=Clnm2T3QIpY) |

> [!TIP]
> GDSC Solution Challenge 2023 참가작. 4인 팀 저장소의 커밋 57개 중 49개를 맡아 앱의 뼈대와 ChatGPT 대화를 구현했습니다.

## 개요

한국은 OECD 국가 중 자살률이 가장 높고, 10대부터 30대까지 사망 원인 1위가 자살입니다. 상담 수요는 크게 늘었지만 상담 전화의 응대율은 60% 가 채 되지 않고, 정신건강 문제를 드러내는 것 자체를 꺼리는 분위기도 여전합니다.

ChatBuddy 는 상담을 받기 부담스러운 청년이 가장 먼저 말을 걸 수 있는 상대를 목표로 했습니다. 걱정인형에서 모티브를 얻은 캐릭터 **츄디** 가 친한 친구처럼 반말로 대화하며 이야기를 들어 주고, 도움이 필요해 보이면 실제 상담 기관으로 이어 주도록 설계했습니다.

## 주요 기능

- **츄디와의 대화** 사용자 이름을 부르며 친구처럼 대답하도록 설정한 ChatGPT(gpt-3.5-turbo)와 대화합니다. 대화는 계정별로 저장돼 다음에 이어집니다.
- **상담 기관 연결** 대화 내용을 OpenAI Moderation API 로 검사해, 위험한 표현이 반복되면 대화 대신 서울시 청년 마음건강사업의 신청 자격, 기간, 상담 방법을 버튼형 안내로 보여 주도록 설계했습니다.
- **자주 쓴 단어** 대화 기록을 형태소 분석해 자주 쓴 단어를 크기가 다른 버블로 보여 줍니다. 요즘 마음에 무엇이 걸려 있는지 돌아보게 하려는 기능입니다.
- **솔루션** 10분 타이머와 음악이 함께 흐르는 휴식 화면입니다.
- **계정** 이메일과 Google 로그인, 비밀번호 변경, 로그아웃, 탈퇴를 지원합니다.

![로그인, 가입, 츄디와의 대화](/content/works/chatbuddy/screens-chat.jpg)

![자주 쓴 단어, 하루 할 일, 10분 솔루션](/content/works/chatbuddy/screens-care.jpg)

## 맡은 일

- 로그인, 회원가입, 설정, 채팅 화면을 포함한 **앱의 초기 코드 전체** 를 만들고, 팀원의 화면과 합쳐 통합했습니다.
- OpenAI API 로 **츄디의 성격과 말투** 를 정하는 시스템 메시지를 작성하고, 대화 흐름과 실패 시 재시도를 구현했습니다.
- Moderation API 로 위험 표현을 확인하고 상담 기관 안내로 넘기는 흐름을 만들었습니다.
- 서울대 꼬꼬마(KKMA) 형태소 분석기로 대화에서 단어를 뽑아 빈도를 세는 **자주 쓴 단어** 화면을 만들었습니다.
- Firebase 로 이메일·Google 로그인과 계정별 대화 기록 저장을 연결했습니다.

![구성: Android 앱, Firebase, OpenAI](/content/works/chatbuddy/architecture.jpg)

## 기술적 도전

### 대화가 길어지면 끊기던 응답

**증상** 대화를 오래 이어 가면 츄디의 응답이 오지 않거나 요청 시간이 초과됐습니다.

**원인** 맥락을 유지하려고 지금까지의 대화를 매번 통째로 보냈기 때문에, 대화가 길어질수록 요청이 커져 모델의 입력 한도에 가까워지고 응답도 느려졌습니다.

**해결** 한 번에 받는 응답의 길이를 줄여 시간 초과를 피하고, 요청이 실패하면 다시 시도하게 했습니다. 세 번 넘게 실패하면 오래된 대화부터 지워 요청 크기를 줄이도록 했습니다.

**결론** 대화가 길어져도 응답이 끊기지 않게 됐습니다. 대화형 서비스에서는 "무엇을 기억시킬지" 만큼 "무엇을 잊게 할지" 도 설계해야 한다는 점을 배웠습니다.

## 돌아보며

정신건강을 다루는 서비스는 대화를 잘하는 것보다 위험한 순간을 놓치지 않는 것이 더 중요합니다. AI 가 상담사를 대신할 수는 없기 때문에, 츄디의 역할을 "먼저 말을 걸 수 있는 친구" 로 정하고 실제 도움은 기관으로 이어 주는 방향으로 설계했습니다. 위험 감지처럼 결과가 중요한 기능일수록 실제 대화로 충분히 시험해 보는 과정이 더 필요했습니다.
