import { notFound, redirect } from "next/navigation";
import { getWorks } from "@/lib/getWorks";
import { findProjectIndex } from "./findProjectIndex";
import DetailShell from "@/components/layout/DetailLayout/DetailShell";
import { pickLocalized } from "@/types/common";

/**
 * 작업물이 있는지 로딩 화면(loading.tsx)보다 먼저 확인한다(#891).
 *
 * loading 이 있으면 응답이 로딩 화면부터 스트리밍되어, 그 뒤 페이지에서 부르는 notFound()·redirect() 는 상태 코드를
 * 바꾸지 못하고 200 응답 안의 내용으로만 전해졌다. 레이아웃은 같은 구간의 로딩 경계 바깥이라, 여기서 부르면 404·307 로
 * 응답한다. 로딩 화면은 그대로 페이지를 감싼다.
 *
 * 커버도 여기서 그린다(#946). 페이지는 로딩 경계 안이라 커버가 셸보다 늦게 공개되어 LCP 가 밀렸다(DetailShell).
 */
export default async function WorkSlugLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const projects = await getWorks();
  const index = findProjectIndex(projects, slug);
  if (index < 0) notFound();

  // 옛 id·번호 주소로 들어왔는데 작업물에 slug 가 있으면 slug 주소로 보낸다. 보통은 proxy 가 그리기 전에 보낸다(#909).
  // 상세는 미리 그리는 경로라 여기서 보내면 첫 요청에 Location 이 두 번 실린다. proxy 의 조회가 실패했을 때를 위해 남긴다
  const projectSlug = projects[index].slug;
  if (projectSlug && projectSlug !== slug) redirect(`/works/${projectSlug}`);

  // alt 는 서버가 그리는 한국어로 시작하고, 영어 화면이면 페이지가 다시 넘긴다
  const { image, title } = projects[index];
  return <DetailShell cover={image ? { image, alt: pickLocalized(title, "ko") } : null}>{children}</DetailShell>;
}
