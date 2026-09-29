---
title: "악성댓글 분류 모델"
title_en: "Malicious Comment Classifier"
slug: comment-classifier
subtitle: "신조어와 오탈자가 섞인 인터넷 댓글을 읽어 내는 KcELECTRA 기반 악성댓글 분류 모델"
subtitle_en: "A KcELECTRA-based model that classifies malicious comments in slang- and typo-filled internet Korean"
category: AI / ML
category_en: AI / ML
nature: 학교 과제 / 졸업작품 / 캡스톤
nature_en: Academic / Thesis / Capstone
order: 8
year: 2023
tech: [Python, PyTorch, Hugging Face Transformers, KcELECTRA, pandas, scikit-learn, Google Colab]
description: "공개된 한국어 댓글 데이터 두 종을 정리해 합치고, 인터넷 구어체로 사전 학습된 KcELECTRA 를 파인튜닝한 악성댓글 이진 분류 모델입니다. 테스트 정확도 92.3%, F1 0.933 을 기록했습니다. 딥러닝 및 응용 과목의 기말 프로젝트입니다."
description_en: "A binary classifier for malicious comments, fine-tuned from KcELECTRA (pre-trained on informal internet Korean) on two cleaned and merged public comment datasets. Test accuracy 92.3%, F1 0.933. Final project for a Deep Learning and Applications course."
role: "데이터 정제와 통합 · 모델 파인튜닝 · 평가"
role_en: "Data cleaning and merging · Fine-tuning · Evaluation"
---

![악성댓글 분류 모델](/content/works/comment-classifier/cover.jpg)

## 한눈에 보기

| 항목 | 내용 |
| --- | --- |
| 기간 | 2023 |
| 과목 | 딥러닝 및 응용 기말 프로젝트 |
| 모델 | beomi/KcELECTRA-base-v2022 (이진 분류) |
| 데이터 | 한국어 댓글 15,825문장 → 정제 후 14,837문장 |
| 성능 | 정확도 92.3%, F1 0.933, 정밀도 0.927, 재현율 0.939 |
| 시연 | [시연 영상 (YouTube)](https://youtu.be/KCSy3P9ooLU) |

> [!TIP]
> 형식이 다른 공개 데이터 두 종을 정리해 합치고 KcELECTRA 를 파인튜닝해, 테스트 정확도 92.3% · F1 0.933 을 기록했습니다.

## 개요

2021년 국가인권위원회 조사에서 응답자 10명 중 8명이 온라인 혐오표현이 심각하다고 답했습니다. 악성댓글을 자동으로 걸러 내려면 모델이 인터넷 댓글을 읽을 수 있어야 하는데, 댓글에는 구어체, 신조어, 비속어, 오탈자가 가득해 정제된 문장으로 학습한 모델은 제대로 알아듣지 못합니다.

그래서 온라인 뉴스 댓글로 사전 학습된 **KcELECTRA** 를 골라, 악성과 정상을 가르는 이진 분류로 파인튜닝했습니다.

![프로젝트 개요: 목표, 데이터, 모델](/content/works/comment-classifier/slide-04.jpg)

## 무엇을 악성으로 볼 것인가

데이터를 합치기 전에 기준부터 정했습니다.

- 욕설, 강한 혐오표현, 비난이 들어 있으면 **악성** 으로 봅니다.
- "존맛", "개이득" 처럼 강조의 뜻으로 쓰인 비속어는 욕설로 보지 않습니다.
- 공격적인 말투라고 해서 모두 악성은 아닙니다. 판단이 애매하면 최대한 정상으로 분류합니다.

## 데이터 준비

두 공개 데이터셋을 합쳐 썼습니다.

| 데이터 | 규모 | 특징 |
| --- | --- | --- |
| korean-malicious-comments-dataset | 10,000문장 | Korean HateSpeech Dataset 기반, 라벨 0 = 악성 |
| Curse-detection-data | 5,825문장 | 커뮤니티 댓글, 라벨 1 = 악성 |

두 데이터는 형식이 달라 그대로 합칠 수 없었고, 세 가지 문제를 차례로 풀었습니다.

1. **읽히지 않는 파일** 구분자로 쓰는 `|` 가 댓글 본문 안에도 들어 있어 파일을 읽는 단계에서 오류가 났습니다. 해당 행을 찾아 원본을 직접 고쳤습니다.
2. **사라진 라벨 25개** 구분자 앞의 특수문자 때문에 라벨이 본문 끝에 붙어 들어가 라벨 칸이 비었습니다. 본문의 마지막 글자를 라벨로 되돌리고 나머지를 본문으로 복구했습니다.
3. **반대로 된 라벨** 두 데이터의 악성 라벨 값이 서로 반대였습니다. 한쪽을 뒤집어 기준을 통일한 뒤 합쳤습니다.

![학습·테스트 분할과 중복 제거 결과](/content/works/comment-classifier/slide-12.jpg)

합친 15,825문장을 8:2 로 나누고 중복 문장을 지워, 학습 11,728문장과 테스트 3,109문장을 만들었습니다.

## 학습

- KcELECTRA 토크나이저로 최대 128 토큰까지 자르고 채웠습니다.
- Hugging Face `Trainer` 로 10 에포크, 배치 크기 8 로 학습했습니다. Google Colab GPU 에서 약 54분이 걸렸습니다.

## 결과

테스트 데이터에서 정확도 92.3%, F1 0.933, 정밀도 0.927, 재현율 0.939 를 기록했습니다. 새 댓글을 넣으면 악성일 확률과 정상일 확률을 함께 보여 주는 추론 예시도 만들었습니다.

![테스트 결과: 정확도 92%](/content/works/comment-classifier/slide-18.jpg)

## 돌아보며

모델보다 데이터 정리에 더 많은 시간이 들었습니다. 라벨이 본문에 붙어 사라진 25개처럼, 숫자로는 작아 보이는 문제도 그대로 두면 학습 데이터 전체의 기준을 흔듭니다. 한 가지 아쉬움은 중복 제거를 학습과 테스트를 나눈 뒤 각각 했다는 점입니다. 두 세트 사이에 같은 문장이 남았을 수 있어, 다시 한다면 먼저 중복을 지우고 나누겠습니다. 문장 전체를 막는 대신 Attention 으로 욕설 부분만 가리는 방식은 다음 과제로 남겼습니다.
