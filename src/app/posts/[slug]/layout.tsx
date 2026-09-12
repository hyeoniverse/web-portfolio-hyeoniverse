import { notFound } from "next/navigation";
import { getPostBySlug } from "@/lib/posts";

/**
 * 글이 있는지 로딩 화면(loading.tsx)보다 먼저 확인한다(#891). loading 이 있으면 응답이 로딩 화면부터 스트리밍되어,
 * 그 뒤 페이지에서 부르는 notFound() 는 404 를 내지 못하고 200 응답(캐시 가능)으로 나갔다. 레이아웃은 같은 구간의
 * 로딩 경계 바깥이라 여기서 부르면 404 로 응답한다. 조회는 getPostBySlug 의 요청 안 캐시로 페이지와 나눠 쓴다.
 */
export default async function PostSlugLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!(await getPostBySlug(slug))) notFound();
  return children;
}
