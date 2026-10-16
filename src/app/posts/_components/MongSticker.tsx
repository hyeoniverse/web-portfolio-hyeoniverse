import Image from "next/image";
import styles from "./MongSticker.module.css";

/* 블로그 곳곳에 붙는 몽이 스티커 — public/images/mascot 의 2D 컷에 흰 테두리를 둘러 스티커처럼.
   장식이라 읽지 않는다. 자리와 크기는 쓰는 곳의 className 이 정한다 */
export type MongPose =
  | "star-front"
  | "wave-front"
  | "wave-left"
  | "sleep-front"
  | "heart-left"
  | "happy-top"
  | "surprised-front";

const SIZES: Record<MongPose, [number, number]> = {
  "star-front": [1544, 1085],
  "wave-front": [728, 1156],
  "wave-left": [693, 1166],
  "sleep-front": [942, 1214],
  "heart-left": [613, 1150],
  "happy-top": [810, 1288],
  "surprised-front": [792, 1262],
};

export default function MongSticker({ pose, className, float = false }: { pose: MongPose; className?: string; float?: boolean }) {
  const [w, h] = SIZES[pose];
  return (
    <span className={`${styles.sticker} ${float ? styles.float : ""} ${className ?? ""}`} aria-hidden>
      <Image src={`/images/mascot/bunny-${pose}.png`} alt="" width={w} height={h} sizes="240px" className={styles.img} />
    </span>
  );
}
