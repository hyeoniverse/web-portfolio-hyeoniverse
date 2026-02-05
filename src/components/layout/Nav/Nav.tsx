"use client";

import Link from "next/link";
import styles from "./Nav.module.css";

const navItems = [
  { name: "Works", href: "/works" },
  { name: "About", href: "/about" },
  { name: "Web Flow", href: "/webflow" },
];

export default function Nav() {
  return (
    <nav className={styles.nav}>
      <Link href="/" className={styles.logo}>
        <span className="glith-on-hover">H</span>
      </Link>
      <div className={styles.navLinks}>
        {navItems.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className={`${styles.navLink} glith-on-hover`}
          >
            {item.name}
          </Link>
        ))}
      </div>
    </nav>
  );
}
