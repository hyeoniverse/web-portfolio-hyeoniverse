"use client";

import OptimizedImage from "@/components/ui/OptimizedImage";
import styles from "./Profile.module.css";
import { useSoundManager } from "@/hooks/useSoundManager";
import { memo } from "react";
import { config } from "@/config";

const Profile = memo(function Profile() {
  const { playSound } = useSoundManager();

  return (
    <div className={styles.profile}>
      {/* Editorial Header */}
      <div className={styles.profileHeader}>
        <h2 className={`${styles.profileTitle}`}>
          Frontend Focused
          <span className={styles.titleAccent}>FullStack Developer</span>
        </h2>
        <div className={`${styles.profileSubtitle}`}>
          {config.personal.eng.name} ✦ {config.personal.name}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className={styles.introduction}>
        {/* Image Section */}
        <div className={`${styles.imageWrapper}`}>
          <div className={`${styles.ornament} orbit-hover-pause`} />
          <OptimizedImage
            src="/images/profile.svg"
            alt="Profile"
            width={400}
            height={400}
            className={styles.profileImage}
            priority={false}
            placeholder="blur"
          />
        </div>

        {/* Text Content */}
        {config.about.introduction.paragraphs.map((paragraph, index) => (
          <p key={index}>
            {paragraph.text}
            {paragraph.highlight && (
              <span className="highlighted-text">{paragraph.highlight}</span>
            )}
            를 목표로 하고 있습니다.
          </p>
        ))}

        {config.about.focusAreas.map((area, index) => (
          <div key={index}>
            <h3>{area.title}</h3>
            <p>{area.content}</p>
          </div>
        ))}
      </div>

      {/* Tags Section with Unified Marquee */}
      <div className={`${styles.tags}`}>
        <div className={styles.marqueeContainer}>
          <div className={`${styles.marqueeContent} marquee`}>
            {/* First set */}
            {config.about.tags.map((item, index) => (
              <div key={index} className={styles.tagItem}>
                {item.isFirst && (
                  <div className={styles.tagLabel}>{item.label}</div>
                )}
                <span
                  className={styles.tag}
                  onMouseEnter={() => playSound("hover")}
                  onTouchStart={() => playSound("hover")}
                >
                  {item.tag}
                </span>
              </div>
            ))}
            {/* Duplicate set for seamless loop */}
            {config.about.tags.map((item, index) => (
              <div key={`duplicate-${index}`} className={styles.tagItem}>
                {item.isFirst && (
                  <div className={styles.tagLabel}>{item.label}</div>
                )}
                <span
                  className={styles.tag}
                  onMouseEnter={() => playSound("hover")}
                  onTouchStart={() => playSound("hover")}
                >
                  {item.tag}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});

export default Profile;
