/**
 * CSS Module 은 클래스명 맵으로 타입을 준다.
 *
 * 예전에는 `declare module "*.css";` 만 있었는데 이건 **타입 없는 선언**이라
 * `import styles from "./X.module.css"` 의 `styles` 가 암묵적 any 가 된다.
 * 이 프로젝트는 CSS Modules 를 전면적으로 쓰므로 `styles.foo` 참조 수천 개가
 * 전부 any 로 집계돼 type-coverage 를 끌어내렸다.
 *
 * 로컬에서는 `next-env.d.ts` 가 참조하는 `.next/types/routes.d.ts` 덕에 Next 의
 * CSS 타입이 잡혀 문제가 드러나지 않았지만, **빌드하지 않는 CI 에는 그 파일이 없어**
 * 같은 명령이 다른 수치를 냈다. 여기서 직접 선언해 환경과 무관하게 같은 결과가 나오게 한다.
 */
declare module "*.module.css" {
  const classes: { readonly [key: string]: string };
  export default classes;
}

declare module "*.css";
declare module "*.scss";
declare module "*.sass";
