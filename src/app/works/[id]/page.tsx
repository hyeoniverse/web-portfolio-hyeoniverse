"use client";

import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import styles from "./WorkDetail.module.css";

// Works data (should be moved to a shared location)
const worksData = [
  { id: "1", title: "Abstract Waves", category: "Brand Identity", year: "2024", main: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&h=800&fit=crop", description: "A visual exploration of fluid dynamics and color theory, creating mesmerizing abstract compositions." },
  { id: "2", title: "Digital Fusion", category: "Web Design", year: "2024", main: "https://images.unsplash.com/photo-1634017839464-5c339bbe3c35?w=1200&h=800&fit=crop", description: "Blending digital art with modern web technologies to create immersive user experiences." },
  { id: "3", title: "Color Symphony", category: "Motion Design", year: "2023", main: "https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=1200&h=800&fit=crop", description: "An animated journey through vibrant color palettes and dynamic compositions." },
  { id: "4", title: "Geometric Dreams", category: "UI/UX Design", year: "2023", main: "https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?w=1200&h=800&fit=crop", description: "Exploring the intersection of geometry and user interface design." },
  { id: "5", title: "Neon Nights", category: "Brand Identity", year: "2023", main: "https://images.unsplash.com/photo-1633167606207-d840b5070fc2?w=1200&h=800&fit=crop", description: "A bold brand identity project inspired by urban nightlife and neon aesthetics." },
  { id: "6", title: "Organic Forms", category: "Web Development", year: "2024", main: "https://images.unsplash.com/photo-1618556450994-a6a128ef0d9d?w=1200&h=800&fit=crop", description: "Bringing natural, organic shapes to life through code and animation." },
  { id: "7", title: "Fluid Motion", category: "Motion Design", year: "2024", main: "https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=1200&h=800&fit=crop", description: "Exploring the beauty of fluid simulations and motion graphics." },
  { id: "8", title: "Gradient Flow", category: "UI/UX Design", year: "2023", main: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1200&h=800&fit=crop", description: "A study in gradient transitions and color flow for digital interfaces." },
  { id: "9", title: "Aurora Display", category: "Web Design", year: "2024", main: "https://images.unsplash.com/photo-1620121692029-d088224ddc74?w=1200&h=800&fit=crop", description: "Capturing the ethereal beauty of aurora borealis in web design." },
];

export default function WorkDetailPage() {
  const params = useParams();
  const router = useRouter();
  const work = worksData.find((w) => w.id === params.id);

  if (!work) {
    return (
      <div className={styles.notFound}>
        <h1>Work not found</h1>
        <Link href="/">Go back home</Link>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Hero Image */}
      <motion.div
        className={styles.heroImage}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <img src={work.main} alt={work.title} />
        <div className={styles.heroOverlay} />
      </motion.div>

      {/* Back Button */}
      <motion.button
        className={styles.backButton}
        onClick={() => router.back()}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span>Back</span>
      </motion.button>

      {/* Content */}
      <div className={styles.content}>
        <motion.div
          className={styles.meta}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          <span className={styles.category}>{work.category}</span>
          <span className={styles.year}>{work.year}</span>
        </motion.div>

        <motion.h1
          className={styles.title}
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          {work.title}
        </motion.h1>

        <motion.p
          className={styles.description}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          {work.description}
        </motion.p>

        <motion.div
          className={styles.actions}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
        >
          <Link href="/" className={styles.viewAllButton}>
            View All Works
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
