import { notFound } from "next/navigation";

/**
 * 관리자 영역의 없는 주소(#889).
 *
 * 없는 주소는 빌드 때 미리 그린 루트 404 HTML 을 그대로 받는다. 그 HTML 은 요청 경로를 모른 채 공개 네비게이션으로
 * 그려져 있어, /admin 아래에서 열면 네비게이션·푸터가 브라우저에서 관리자용으로 그려지며 하이드레이션이 깨졌다.
 * 이 경로가 받아 notFound() 를 부르면 404 를 요청 경로로 다시 그린다. 공개 영역의 404 는 정적 HTML 그대로 둔다.
 *
 * (dashboard) 밖에 둔다. 그 레이아웃은 관리자 사전을 받을 때까지 자식을 그리지 않아(AdminTranslationsGate), 안에 두면
 * 서버 HTML 에 404 가 담기지 않고 응답이 200 이 됐다(#903). 로그인 확인은 proxy 가 먼저 한다.
 */
export default function AdminMissingPage() {
  notFound();
}
