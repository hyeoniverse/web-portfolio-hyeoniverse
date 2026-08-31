import Link from "next/link";
import { ArrowLeft } from "@/components/icons";
import { cn } from "@/utils/cn";
import styles from "./BackLink.module.css";
import Pressable from "@/components/ui/Pressable";

interface BackLinkProps {
  href?: string;
  onClick?: () => void;
  label: string;
  className?: string;
  size?: number;
}

export default function BackLink({ href, onClick, label, className, size = 14 }: BackLinkProps) {
  const content = (
    <>
      <ArrowLeft size={size} strokeWidth={1.8} className={styles.arrow} aria-hidden />
      <span>{label}</span>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={cn(styles.link, className)} onClick={onClick}>
        {content}
      </Link>
    );
  }

  return (
    <Pressable className={cn(styles.link, className)} onClick={onClick}>
      {content}
    </Pressable>
  );
}
