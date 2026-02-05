"use client";

import { JSX, memo, useEffect, useState } from "react";
import { motion } from "framer-motion";
import styles from "./FloatingElements.module.css";

const FloatingElements = () => {
  const [elements, setElements] = useState<JSX.Element[] | null>(null);

  useEffect(() => {
    const generated = Array.from({ length: 6 }, (_, i) => (
      <motion.div
        key={i}
        className={styles.floatingElement}
        initial={{
          opacity: 0,
          scale: 0,
          x: Math.random() * 200 - 100,
          y: Math.random() * 200 - 100,
        }}
        animate={{
          opacity: [0, 0.3, 0],
          scale: [0, 1, 0],
          x: [
            Math.random() * 200 - 100,
            Math.random() * 400 - 200,
            Math.random() * 200 - 100,
          ],
          y: [
            Math.random() * 200 - 100,
            Math.random() * 400 - 200,
            Math.random() * 200 - 100,
          ],
        }}
        transition={{
          duration: 8 + Math.random() * 4,
          repeat: Number.POSITIVE_INFINITY,
          delay: i * 0.5,
          ease: "easeInOut",
        }}
        style={{
          left: `${10 + i * 15}%`,
          top: `${20 + i * 10}%`,
        }}
      />
    ));
    setElements(generated);
  }, []);

  return <div className={styles.floatingContainer}>{elements}</div>;
};

export default memo(FloatingElements);