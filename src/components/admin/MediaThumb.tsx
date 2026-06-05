/** Admin 호출처용 재export — admin 쪽은 next/image optimizer 우회(unoptimized) 기본값 */
import MediaThumb, { type MediaThumbProps } from "@/components/ui/MediaThumb";

export default function AdminMediaThumb(props: MediaThumbProps) {
  return <MediaThumb unoptimized {...props} />;
}
