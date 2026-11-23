## 관계 대수

관계 대수는 릴레이션(튜플의 집합)을 처리하는 연산의 집합이다.

| 분류             | 연산자                             | 기호 |
| ---------------- | ---------------------------------- | ---- |
| 일반 집합 연산자 | 합집합(UNION)                      | ∪    |
|                  | 교집합(INTERSECT)                  | ∩    |
|                  | 차집합(DIFFERENCE)                 | −    |
|                  | 카티션 프로덕트(CARTESIAN PRODUCT) | ×    |
| 순수 관계 연산자 | 실렉트(SELECT)                     | σ    |
|                  | 프로젝트(PROJECT)                  | π    |
|                  | 조인(JOIN)                         | ⋈    |
|                  | 디비전(DIVISION)                   | ÷    |

> [!IMPORTANT] 폐쇄 성질
> ==관계 대수는 피연산자와 연산 결과가 모두 릴레이션인 폐쇄 성질(closure property)을 가진다.== 그래서 한 연산의 결과를 다른 연산의 피연산자로 넣는 중첩(nested) 수식을 쓸 수 있다.

## 일반 집합 연산자

| 연산            | 정의                                                                                       | 결과 카디널리티                                                                                        |
| --------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| 합집합          | `R \cup S = \{ t \vert t \in R \lor t \in S \}{:math}`                                     | `\lvert R \cup S \rvert \le \lvert R \rvert + \lvert S \rvert{:math}` (중복 튜플은 하나만 남는다)      |
| 교집합          | `R \cap S = \{ t \vert t \in R \land t \in S \}{:math}`                                    | `\lvert R \cap S \rvert \le \min\{\lvert R \rvert, \lvert S \rvert\}{:math}`                           |
| 차집합          | `R - S = \{ t \vert t \in R \land t \notin S \}{:math}`                                    | `\lvert R - S \rvert \le \lvert R \rvert{:math}`                                                       |
| 카티션 프로덕트 | `R \times S = \{ r \cdot s \vert r \in R \land s \in S \}{:math}` (·는 접속 concatenation) | `\lvert R \times S \rvert = \lvert R \rvert \times \lvert S \rvert{:math}`, 차수는 R의 차수 + S의 차수 |

합집합·교집합·차집합의 피연산자는 **합병 가능(union-compatible)** 해야 한다.

1. 두 릴레이션의 차수가 같다.
2. 대응하는 애트리뷰트 쌍마다 도메인이 같다.

![R = {100, 200, 300}, S = {300, 400}의 합집합·교집합·차집합 벤 다이어그램과 카티션 프로덕트 3×2 격자](./images/db-relational-algebra-set-ops.svg '학번 릴레이션 두 개에 집합 연산을 적용한 결과')

∪, ∩, ×는 결합적(associative)이고 교환적(commutative)이다. 차집합은 둘 다 아니다.

```math
\begin{aligned}
R \cup S \cup T &= (R \cup S) \cup T = R \cup (S \cup T) &\qquad R \cup S &= S \cup R \\
R \cap S \cap T &= (R \cap S) \cap T = R \cap (S \cap T) &\qquad R \cap S &= S \cap R \\
R \times S \times T &= (R \times S) \times T = R \times (S \times T) &\qquad R \times S &= S \times R
\end{aligned}
```

## 순수 관계 연산자

![실렉트, 프로젝트, 자연 조인이 고르는 부분](./images/db-relational-algebra-operators.svg '실렉트는 행을, 프로젝트는 열을 고르고, 조인은 공통 열로 두 릴레이션을 잇는다')

릴레이션 `R(X) = R(A_1, \dots, A_n){:math}`의 튜플 r에서 애트리뷰트 Ai의 값을 `r.A_i{:math}` 또는 `r[A_i]{:math}`로 쓴다. 애트리뷰트 집합 X에 대한 값은 `r[X]{:math}`다.

### 실렉트(σ)

조건을 만족하는 튜플만 고른다. 결과는 릴레이션의 **수평적 부분집합(horizontal subset)** 이다.

```math
\begin{aligned}
&\sigma_{\text{조건}}(R) = \{ r \mid r \in R \land \text{조건}(r) \} \\
&\text{조건: } A \,\theta\, v \text{ 또는 } A \,\theta\, B,\quad \theta \in \{ =, \ne, <, \le, >, \ge \},\quad \land, \lor, \lnot \text{ 로 결합 가능}
\end{aligned}
```

조건식(predicate)은 데이터 언어 형식으로 `R WHERE 조건식`처럼 쓰기도 한다. 실렉트는 교환적이고, 연속된 실렉트는 조건을 ∧로 묶은 실렉트 하나와 같다.

```math
\sigma_{\text{조건}_2}(\sigma_{\text{조건}_1}(R)) = \sigma_{\text{조건}_1}(\sigma_{\text{조건}_2}(R)) = \sigma_{\text{조건}_1 \land \text{조건}_2}(R)
```

==선택도(selectivity)는 선택 조건으로 검색되는 튜플의 비율이다.==

`\sigma_{\text{학과}=\text{'컴퓨터'}}(\text{학생}){:math}`의 결과는 다음과 같다.

| 학번 | 이름   | 학년 | 학과   |
| ---- | ------ | ---- | ------ |
| 100  | 나수영 | 4    | 컴퓨터 |
| 300  | 정기태 | 1    | 컴퓨터 |
| 400  | 송병길 | 4    | 컴퓨터 |

`\sigma_{\text{학번}=300 \land \text{과목번호}=\text{'C312'}}(\text{등록}){:math}`은 `<300, C312, A, 90, 95>` 한 튜플을 반환한다. 조건에 애트리뷰트끼리의 비교도 쓸 수 있어, `\sigma_{\text{중간성적}<\text{기말성적}}(\text{등록}){:math}`은 기말성적이 중간성적보다 높은 다음 다섯 튜플을 반환한다.

| 학번 | 과목번호 | 성적 | 중간성적 | 기말성적 |
| ---- | -------- | ---- | -------- | -------- |
| 100  | C413     | A    | 90       | 95       |
| 300  | C312     | A    | 90       | 95       |
| 400  | C312     | A    | 90       | 95       |
| 400  | C413     | B    | 80       | 85       |
| 400  | E412     | C    | 65       | 75       |

![σAθv(R), σAθB(R) 정의식과 θ 비교 연산자·상수 v 설명](./images/db-relational-algebra-note-01.jpg 'σAθv(R), σAθB(R) 정의식과 θ 비교 연산자·상수 v 설명')

### 프로젝트(π)

지정한 애트리뷰트만 남긴다. 결과는 릴레이션의 **수직적 부분집합(vertical subset)** 이다.

```math
\begin{aligned}
&Y \subseteq X,\ Y = \{B_1, \dots, B_m\} \text{ 일 때} \\
&\pi_Y(R) = \{ \langle r.B_1, \dots, r.B_m \rangle \mid r \in R \}
\end{aligned}
```

> [!WARNING]
> ==결과도 릴레이션이므로 중복 튜플은 제거된다.== `\pi_{\text{학과}}(\text{학생}){:math}`은 다섯 튜플이 아니라 {컴퓨터, 전기, 산공} 세 튜플이다.

같은 릴레이션에 프로젝트를 겹쳐 쓰면 바깥쪽만 남는다(`\pi_Y(\pi_X(R)) = \pi_Y(R){:math}`, `Y \subseteq X{:math}`).

![π이름,학과(학생) 결과 표(이름·학과 5행)](./images/db-relational-algebra-note-02.jpg 'π이름,학과(학생) 결과 표(이름·학과 5행)')

### 조인(⋈)

두 릴레이션의 튜플을 조건에 따라 연결한다. 조건에 쓰는 애트리뷰트를 조인 애트리뷰트(join attribute)라 한다.

| 종류                                        | 정의                                                                                                     | 결과 애트리뷰트                                      |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| 세타 조인(theta join)                       | `R \bowtie_{A \theta B} S = \{ r \cdot s \vert r \in R \land s \in S \land r.A \,\theta\, s.B \}{:math}` | R의 차수 + S의 차수                                  |
| 동일 조인(equijoin)                         | 세타 조인에서 θ가 `=`인 경우                                                                             | R의 차수 + S의 차수 (조인 애트리뷰트가 두 번 나온다) |
| 자연 조인(natural join, `\bowtie_N{:math}`) | 동일 조인 결과에서 중복 조인 애트리뷰트를 제거                                                           | R과 S의 애트리뷰트 합집합                            |

결과 릴레이션에서 이름이 같은 애트리뷰트는 원래 릴레이션 이름을 한정어로 붙여 `학생.학번`, `등록.학번`처럼 구분한다. 이름이 겹치지 않는 애트리뷰트는 이름만 쓴다.

자연 조인은 `R(X){:math}`, `S(Y){:math}`의 공통 애트리뷰트 `Z = X \cap Y{:math}`로 연결한다.


## 연습문제 풀이

<details>
<summary>7. 연산 결과 릴레이션의 기본 키</summary>

> 두 릴레이션 R과 S가 있다고 하자. 다음 연산의 결과 릴레이션에 대한 기본 키를 식별해 보라.

R의 기본 키를 A, S의 기본 키를 B로 둔다. 결과 릴레이션의 기본 키는 결과 튜플을 유일하게 식별하는 최소 애트리뷰트 집합이다.

| 연산                             | 결과의 기본 키                                         | 이유                                                                                                 |
| -------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `\sigma_{\text{조건}}(R){:math}` | A                                                      | R의 튜플 일부만 남으므로 그대로 유일하다                                                             |
| `\pi_Y(R){:math}`                | Y 전체 (`A \subseteq Y{:math}`이면 A)                  | 프로젝트는 중복을 제거하므로 Y 전체는 항상 유일하다. Y가 A를 포함하면 A만으로 원래 튜플이 정해진다   |
| `R \times S{:math}`              | AB                                                     | R의 튜플과 S의 튜플 짝마다 하나씩 생긴다                                                             |
| `R \cup S{:math}`                | 모든 애트리뷰트                                        | 두 릴레이션의 튜플이 섞이므로 A만으로는 유일하다는 보장이 없다                                       |
| `R \cap S{:math}`                | A (또는 B)                                             | 결과는 R의 부분집합이자 S의 부분집합이므로 A와 B 모두 후보 키다                                      |
| `R - S{:math}`                   | A                                                      | 결과는 R의 부분집합이다                                                                              |
| `R \bowtie_{A=B} S{:math}`       | A (또는 B)                                             | A 값이 R의 튜플을 정하고, 같은 값인 B가 S의 튜플을 정한다. AB는 슈퍼 키지만 최소성을 만족하지 않는다 |
| `R \div S{:math}`                | `D = X - Y{:math}` 전체 (`A \subseteq D{:math}`이면 A) | 결과는 `\pi_D(R){:math}`의 부분집합이라 프로젝트와 같은 규칙이 적용된다                              |

==동일 조인의 조인 애트리뷰트가 양쪽의 기본 키이면, R의 튜플 하나는 S의 튜플 최대 하나와만 짝을 이룬다.== 그래서 결과의 기본 키는 A 하나로 충분하다.

</details>

<details>
<summary>8. 납품 데이터베이스 질의를 관계 대수와 관계 해석으로</summary>

> S(Sno, Sname, Status, City), P(Pno, Pname, Colour, Weight), SP(Sno, Pno, Qty)에 대해 다음 질의를 관계 대수, 관계 해석으로 표현하라. (가) 모든 납품업자의 Sname과 City (나) Pno가 123인 제품을 발송한 납품업자의 Sname (다) Colour가 red인 제품의 Pname (라) Pname이 Nut인 제품을 발송한 납품업자의 Sname

스키마는 [관계 데이터 모델 글](/memo/db-relational-model-keys)의 납품 데이터베이스와 같다. 인스턴스가 주어지지 않아 결과 표 대신 식만 적는다.

| 질의 | 관계 대수식                                                                                                 | 튜플 해석식                                                                                                                                                                                                          |
| ---- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| (가) | `\pi_{\mathit{Sname},\mathit{City}}(S){:math}`                                                              | `\{ s.\mathit{Sname}, s.\mathit{City} \vert S(s) \}{:math}`                                                                                                                                                          |
| (나) | `\pi_{\mathit{Sname}}(S \bowtie_{\mathit{Sno}=\mathit{Sno}} \sigma_{\mathit{Pno}=123}(\mathit{SP})){:math}` | `\{ s.\mathit{Sname} \vert S(s) \land (\exists y)(\mathit{SP}(y) \land y.\mathit{Sno} = s.\mathit{Sno} \land y.\mathit{Pno} = 123) \}{:math}`                                                                        |
| (다) | `\pi_{\mathit{Pname}}(\sigma_{\mathit{Colour}=\text{'red'}}(P)){:math}`                                     | `\{ p.\mathit{Pname} \vert P(p) \land p.\mathit{Colour} = \text{'red'} \}{:math}`                                                                                                                                    |
| (라) | `\pi_{\mathit{Sname}}(S \bowtie_N (\mathit{SP} \bowtie_N \sigma_{\mathit{Pname}=\text{'Nut'}}(P))){:math}`  | `\{ s.\mathit{Sname} \vert S(s) \land (\exists y)(\exists p)(\mathit{SP}(y) \land P(p) \land y.\mathit{Sno} = s.\mathit{Sno} \land y.\mathit{Pno} = p.\mathit{Pno} \land p.\mathit{Pname} = \text{'Nut'}) \}{:math}` |

(라)에서 S와 P에는 공통 애트리뷰트가 없어 둘을 바로 조인할 수 없다. ==납품업자와 제품은 발송(SP)을 통해서만 연결되므로, SP와 P를 먼저 조인해 Nut의 발송 튜플을 구한 뒤 S와 조인해야 한다.== 튜플 해석식에서도 SP의 튜플 변수 y가 s와 p를 잇는다.

```text
A = σPname='Nut'(P)
B = SP ⋈N A        -- Nut를 발송한 (Sno, Pno, Qty, …)
C = S ⋈N B
πSname(C)
```

도메인 해석식으로 쓰면 다음과 같다.

<details>
<summary>도메인 해석식</summary>

```math
\begin{aligned}
&\text{(가)}\ \{ x_{\mathit{Sname}}, x_{\mathit{City}} \mid (\exists x_{\mathit{Sno}})(\exists x_{\mathit{Status}})\, S(x_{\mathit{Sno}}, x_{\mathit{Sname}}, x_{\mathit{Status}}, x_{\mathit{City}}) \} \\[4pt]
&\text{(나)}\ \{ x_{\mathit{Sname}} \mid (\exists x_{\mathit{Sno}})(\exists x_{\mathit{Status}})(\exists x_{\mathit{City}})(S(x_{\mathit{Sno}}, x_{\mathit{Sname}}, x_{\mathit{Status}}, x_{\mathit{City}}) \\
&\qquad \land (\exists x_{\mathit{Pno}})(\exists x_{\mathit{Qty}})(\mathit{SP}(x_{\mathit{Sno}}, x_{\mathit{Pno}}, x_{\mathit{Qty}}) \land x_{\mathit{Pno}} = 123)) \} \\[4pt]
&\text{(다)}\ \{ x_{\mathit{Pname}} \mid (\exists x_{\mathit{Pno}})(\exists x_{\mathit{Colour}})(\exists x_{\mathit{Weight}})(P(x_{\mathit{Pno}}, x_{\mathit{Pname}}, x_{\mathit{Colour}}, x_{\mathit{Weight}}) \\
&\qquad \land x_{\mathit{Colour}} = \text{'red'}) \} \\[4pt]
&\text{(라)}\ \{ x_{\mathit{Sname}} \mid (\exists x_{\mathit{Sno}})(\exists x_{\mathit{Status}})(\exists x_{\mathit{City}})(S(x_{\mathit{Sno}}, x_{\mathit{Sname}}, x_{\mathit{Status}}, x_{\mathit{City}}) \\
&\qquad \land (\exists x_{\mathit{Pno}})(\exists x_{\mathit{Qty}})(\mathit{SP}(x_{\mathit{Sno}}, x_{\mathit{Pno}}, x_{\mathit{Qty}}) \\
&\qquad \land (\exists x_{\mathit{Pname}})(\exists x_{\mathit{Colour}})(\exists x_{\mathit{Weight}})(P(x_{\mathit{Pno}}, x_{\mathit{Pname}}, x_{\mathit{Colour}}, x_{\mathit{Weight}}) \\
&\qquad \land x_{\mathit{Pname}} = \text{'Nut'}))) \}
\end{aligned}
```

같은 도메인 변수(`x_{\mathit{Sno}}{:math}`, `x_{\mathit{Pno}}{:math}`)를 두 범위식에 함께 쓰면 조인 조건이 된다.

</details>

</details>

