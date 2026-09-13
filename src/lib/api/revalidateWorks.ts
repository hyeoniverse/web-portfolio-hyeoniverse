import { revalidatePath } from "next/cache";

/**
 * 공개 작업물 화면을 다시 그리게 한다(#909). 작업물 상세는 미리 그려 캐시하므로(ISR), 저장한 내용이 바로 보이려면
 * 쓰기가 모두 끝난 뒤 불러야 한다.
 *
 * 상세는 이전·다음 작업물의 제목도 보여 줘서, 한 작업물의 제목·순서·공개 여부가 바뀌면 이웃 상세도 달라진다.
 * 그래서 바뀐 한 곳이 아니라 상세 경로 전체를 다시 그리게 한다. 목록(/works)도 함께 새로 그린다.
 * 태그 페이지도 같은 태그(tech)의 작업물을 보여 줘서 함께 다시 그린다(#913). 글 상세도 관련 작업물 카드(제목·사진·
 * 공개 여부)를 서버에서 그려 함께 다시 그린다(#917).
 */
export function revalidatePublicWorks() {
  revalidatePath("/works");
  revalidatePath("/works/[slug]", "page");
  revalidatePath("/posts/tags/[tag]", "page");
  revalidatePath("/posts/[slug]", "page");
}
