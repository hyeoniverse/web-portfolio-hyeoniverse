"use client";

import { motion, Variants } from "framer-motion";
import { useRouter } from "next/navigation";
import { Typography } from "./Typography";
import styles from "./Logo.module.css";

interface LogoProps {
  variant?: "default" | "minimal" | "icon";
  size?: "sm" | "md" | "lg";
  className?: string;
  animated?: boolean;
  onClick?: () => void;
}

export function Logo({
  variant = "default",
  size = "md",
  className = "",
  animated = true,
  onClick,
}: LogoProps) {
  const router = useRouter();

  const handleClick = () => {
    if (onClick) onClick();
    else router.push("/");
  };

  const logoClasses = `${styles.logo} ${styles[variant]} ${styles[size]} ${className}`;

  const letterVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.1, duration: 0.6, ease: "easeOut" },
    }),
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const motionProps = {
    "data-clickable": true,
    className: logoClasses,
    onClick: handleClick,
    initial: animated ? "hidden" : undefined,
    animate: animated ? "visible" : undefined,
    variants: animated ? containerVariants : undefined,
  };

  // ----------------------
  // Variant Components
  // ----------------------
  const DefaultLogo = () => (
    <motion.div
      {...motionProps}
      whileHover={animated ? { scale: 1.02 } : undefined}
      whileTap={animated ? { scale: 0.98 } : undefined}
    >
      <div className={styles.letterContainer}>
        {["H", "Y", "E", "O", "N"].map((letter, index) => (
          <motion.span
            key={letter}
            className={styles.letter}
            variants={animated ? letterVariants : undefined}
            custom={index}
          >
            <Typography variant="h2" className={styles.letterText}>
              {letter}
            </Typography>
          </motion.span>
        ))}
      </div>
      {animated ? (
        <motion.div
          className={styles.underline}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.8, duration: 0.6 }}
        />
      ) : (
        <div className={styles.underline} />
      )}
    </motion.div>
  );

  const MinimalLogo = () => (
    <motion.div
      {...motionProps}
      whileHover={animated ? { opacity: 0.8 } : undefined}
      initial={animated ? { opacity: 0 } : undefined}
      animate={animated ? { opacity: 1 } : undefined}
      transition={animated ? { duration: 0.6 } : undefined}
    >
      <Typography variant="body1" className={styles.minimalText}>
        Hyeon
      </Typography>
    </motion.div>
  );

  const IconLogo = () => (
    <motion.div
      {...motionProps}
      whileHover={animated ? { scale: 1.05 } : undefined}
      whileTap={animated ? { scale: 0.95 } : undefined}
    >
      <div className={styles.iconContainer}>
        <Typography variant="h3" className={styles.iconText}>
          H
        </Typography>
      </div>
    </motion.div>
  );

  // ----------------------
  // Variant 선택
  // ----------------------
  switch (variant) {
    case "icon":
      return <IconLogo />;
    case "minimal":
      return <MinimalLogo />;
    default:
      return <DefaultLogo />;
  }
}
