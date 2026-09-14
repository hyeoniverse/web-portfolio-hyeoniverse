import { notFound } from "next/navigation";
import { getPostBySlug } from "@/lib/posts";
import DetailShell from "@/components/layout/DetailLayout/DetailShell";

/**
 * 글이 있는지 로딩 화면(loading.tsx)보다 먼저 확인한다(#891). loading 이 있으면 응답이 로딩 화면부터 스트리밍되어,
 * 그 뒤 페이지에서 부르는 notFound() 는 404 를 내지 못하고 200 응답(캐시 가능)으로 나갔다. 레이아웃은 같은 구간의
 * 로딩 경계 바깥이라 여기서 부르면 404 로 응답한다. 조회는 getPostBySlug 의 요청 안 캐시로 페이지와 나눠 쓴다.
 *
 * 커버도 여기서 그린다(#946). 페이지는 로딩 경계 안이라 커버가 셸보다 늦게 공개되어 LCP 가 밀렸다(DetailShell).
 */
export default async function PostSlugLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();
  // 서버는 화면 언어를 모르므로(한국어로 그린다) 글 상세 제목과 같은 규칙으로 alt 를 정한다: 한국어 본문이 없을 때만 영어 제목.
  // 영어 화면이거나 보기 언어를 바꾸면 페이지가 alt 를 다시 넘긴다
  const alt = post.content_en && !post.content ? post.title_en || post.title : post.title || post.title_en || "";
  return (
    <DetailShell
      cover={post.cover_image ? { image: post.cover_image, alt, position: post.cover_position, zoom: post.cover_zoom } : null}
      placeholderOnError
    >
      {children}
    </DetailShell>
  );
}
