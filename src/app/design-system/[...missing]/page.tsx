import { notFound } from "next/navigation";

/**
 * 디자인 시스템 영역의 없는 주소(#889). 푸터가 /design-system 아래에서 보기 전환 단추를 따로 그려, 미리 그린 루트 404 HTML 과
 * 어긋났다. 관리자 영역의 [...missing] 과 같은 이유로 여기서 notFound() 를 불러 요청 경로로 404 를 그린다.
 */
export default function DesignSystemMissingPage() {
  notFound();
}
