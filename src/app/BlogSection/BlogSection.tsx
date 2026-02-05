"use client";

import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { useAppStore } from "@/stores/appStore";
import { ArrowRight, Star } from "lucide-react";
import styles from "./BlogSection.module.css";
import { fadeIn } from "@/animations";
import { EditorialHeader } from "@/components/common/EditorialHeader";
import { EditorialFooter } from "@/components/common/EditorialFooter";
import TypeWriter from "@/components/effects/TypeWriter";

export default function BlogSection() {
  const { blogPosts } = useAppStore();
  const currentYear = new Date().getFullYear();

  const featuredPosts = blogPosts.filter((post) => post.featured);
  const regularPosts = blogPosts.filter((post) => !post.featured);

  const [ref, inView] = useInView({
    threshold: 0.1,
    triggerOnce: false,
  });

  return (
    <div ref={ref} className="container">
      <EditorialHeader
        inView={inView}
        leftContent={
          <>
            <span className={styles.issueNumber}>Issue #06</span>
            <span className={styles.category}>Blog</span>
          </>
        }
        centerContent={
          <span className={styles.title}>
            Development Journal ・・・✦ THOUGHTS & INSIGHTS ✦・・・
          </span>
        }
        rightContent={
          <span className={styles.postCount}>{blogPosts.length} Posts</span>
        }
      />

      <div className={styles.contentContainer}>
        <div className="grid-background" />

        <motion.div
          className={styles.heroSection}
          variants={fadeIn}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          transition={{ delay: 0.2 }}
        >
          <TypeWriter
            className={styles.heroTitle}
            text={"Blog"}
            caption={"개발 과정에서 배운 것들과 경험을 공유합니다."}
            captionClassName={styles.subtitle}
          />
        </motion.div>

        {featuredPosts.length > 0 && (
          <motion.div
            className={styles.featuredSection}
            variants={fadeIn}
            initial="hidden"
            animate={inView ? "visible" : "hidden"}
            transition={{ delay: 0.3 }}
          >
            <div className={styles.featuredHeader}>
              <Star className={styles.starIcon} size={20} />
              <h2 className={styles.featuredTitle}>Featured Posts</h2>
            </div>

            <div className={styles.featuredGrid}>
              {featuredPosts.map((post, index) => (
                <motion.article
                  key={post.id}
                  className={styles.featuredCard}
                  initial={{ opacity: 0, y: 20 }}
                  animate={
                    inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }
                  }
                  transition={{ delay: 0.1 * index }}
                >
                  <a
                    href={post.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.cardLink}
                  >
                    <div className={styles.imageContainer}>
                      <div
                        className={styles.cardImage}
                        style={{
                          backgroundImage: `url(/images/placeholder.svg)`,
                        }}
                      />
                      <div className={styles.imageOverlay} />
                      <div className={styles.featuredBadge}>
                        <Star size={14} />
                        <span>Featured</span>
                      </div>
                    </div>

                    <div className={styles.cardContent}>
                      <div className={styles.cardMeta}>
                        <span className={styles.cardCategory}>
                          {post.category}
                        </span>
                        <span className={styles.cardDivider}>—</span>
                        <span className={styles.cardDate}>{post.date}</span>
                      </div>
                      <h3 className={styles.cardTitle}>{post.title}</h3>
                      <p className={styles.cardExcerpt}>{post.excerpt}</p>
                      <div className={styles.cardFooter}>
                        <span className={styles.readTime}>{post.readTime}</span>
                        <ArrowRight className={styles.arrowIcon} size={16} />
                      </div>
                    </div>
                  </a>
                </motion.article>
              ))}
            </div>
          </motion.div>
        )}

        {regularPosts.length > 0 && (
          <>
            <motion.div
              className={styles.sectionDivider}
              variants={fadeIn}
              initial="hidden"
              animate={inView ? "visible" : "hidden"}
              transition={{ delay: 0.4 }}
            >
              <h2 className={styles.sectionTitle}>All Posts</h2>
            </motion.div>

            <motion.div
              className={styles.blogGrid}
              variants={fadeIn}
              initial="hidden"
              animate={inView ? "visible" : "hidden"}
              transition={{ delay: 0.5 }}
            >
              {regularPosts.map((post, index) => (
                <motion.article
                  key={post.id}
                  className={`${styles.blogCard} ${index % 5 === 0 ? styles.fullWidth : ""}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={
                    inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }
                  }
                  transition={{ delay: 0.1 * index }}
                >
                  <a
                    href={post.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.cardLink}
                  >
                    <div className={styles.imageContainer}>
                      <div
                        className={styles.cardImage}
                        style={{
                          backgroundImage: `url(/images/placeholder.svg)`,
                        }}
                      />
                      <div className={styles.imageOverlay} />
                    </div>

                    <div className={styles.cardContent}>
                      <div className={styles.cardMeta}>
                        <span className={styles.cardCategory}>
                          {post.category}
                        </span>
                        <span className={styles.cardDivider}>—</span>
                        <span className={styles.cardDate}>{post.date}</span>
                      </div>
                      <h3 className={styles.cardTitle}>{post.title}</h3>
                      <p className={styles.cardExcerpt}>{post.excerpt}</p>
                      <div className={styles.cardFooter}>
                        <span className={styles.readTime}>{post.readTime}</span>
                        <ArrowRight className={styles.arrowIcon} size={16} />
                      </div>
                    </div>
                  </a>
                </motion.article>
              ))}
            </motion.div>
          </>
        )}
      </div>

      <EditorialFooter
        inView={inView}
        className={styles.customFooter}
        leftContent={<span className={styles.pageInfo}>POWER OF WORDS</span>}
        centerContent={
          <motion.a
            href="https://velog.io"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.viewAllButton}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <span>VIEW ALL POSTS</span>
            <ArrowRight size={16} />
          </motion.a>
        }
        rightContent={<span className={styles.pageInfo}>{currentYear}</span>}
      />
    </div>
  );
}
