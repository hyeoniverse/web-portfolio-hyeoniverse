"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/common/Logo";
import styles from "./AdminHeader.module.css";

interface AdminHeaderProps {
  email: string;
}

export default function AdminHeader({ email }: AdminHeaderProps) {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/admin/auth", { method: "DELETE" });
    router.push("/admin/login");
    router.refresh();
  };

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <Logo variant="short" />
        <Link href="/admin/posts" className={styles.logo}>
          Admin
        </Link>
      </div>

      <div className={styles.right}>
        <span className={styles.email}>{email}</span>
        <button onClick={handleLogout} className={styles.logoutBtn}>
          Logout
        </button>
      </div>
    </header>
  );
}
