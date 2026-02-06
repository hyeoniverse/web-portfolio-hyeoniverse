"use client";

import { useRef, useLayoutEffect, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useLanguage } from "@/providers/LanguageProvider";
import { useLenis } from "@/providers/LenisProvider";
import styles from "./WorksSection.module.css";

// Register GSAP plugins
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const projects = [
  {
    id: "1",
    number: "01",
    title: "Sakharov Space",
    subtitle: "Beyond the Horizon",
    category: "Branding / Web Design",
    year: "2024",
    description:
      "우주 탐사 스타트업을 위한 브랜드 아이덴티티 및 웹 경험 디자인",
    role: "Lead Designer",
    tech: ["Figma", "Next.js", "Three.js"],
    metrics: { views: "24K", duration: "3 months" },
    image:
      "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=1200&h=700&fit=crop",
    size: "large",
  },
  {
    id: "2",
    number: "02",
    title: "Fitil App",
    subtitle: "Move with Purpose",
    category: "UX/UI / Mobile",
    year: "2023",
    description: "피트니스 트래킹과 소셜 기능을 결합한 모바일 앱 디자인",
    role: "Product Designer",
    tech: ["Figma", "Protopie", "React Native"],
    metrics: { views: "18K", duration: "4 months" },
    image:
      "https://images.unsplash.com/photo-1576678927484-cc907957088c?w=1200&h=700&fit=crop",
    size: "small",
  },
  {
    id: "3",
    number: "03",
    title: "Amway Digital",
    subtitle: "Commerce Reimagined",
    category: "E-commerce",
    year: "2023",
    description: "글로벌 이커머스 플랫폼의 사용자 경험 재설계",
    role: "UX Designer",
    tech: ["Sketch", "Zeplin", "Vue.js"],
    metrics: { views: "42K", duration: "6 months" },
    image:
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&h=700&fit=crop",
    size: "medium",
  },
  {
    id: "4",
    number: "04",
    title: "Nova Finance",
    subtitle: "Data at a Glance",
    category: "Dashboard",
    year: "2024",
    description: "핀테크 스타트업을 위한 실시간 금융 대시보드 디자인",
    role: "UI Designer",
    tech: ["Figma", "D3.js", "React"],
    metrics: { views: "15K", duration: "2 months" },
    image:
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&h=700&fit=crop",
    size: "tall",
  },
  {
    id: "5",
    number: "05",
    title: "Luxe Brand",
    subtitle: "Timeless Elegance",
    category: "Branding",
    year: "2024",
    description: "프리미엄 라이프스타일 브랜드의 비주얼 아이덴티티 구축",
    role: "Brand Designer",
    tech: ["Illustrator", "After Effects"],
    metrics: { views: "31K", duration: "5 months" },
    image:
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&h=700&fit=crop",
    size: "wide",
  },
  {
    id: "6",
    number: "06",
    title: "TechStart",
    subtitle: "Innovation Hub",
    category: "Web App",
    year: "2023",
    description: "스타트업 인큐베이터를 위한 협업 플랫폼 설계",
    role: "Product Designer",
    tech: ["Figma", "TypeScript", "Node.js"],
    metrics: { views: "12K", duration: "3 months" },
    image:
      "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1200&h=700&fit=crop",
    size: "small",
  },
];

// 10 sets for smooth infinite scroll - no wrap needed for practical use
const allProjects = Array(10).fill(projects).flat();

interface TransitionData {
  id: string;
  image: string;
  rect: DOMRect;
}

const LONG_HOVER_DURATION = 2500; // 2.5 seconds for long hover

export default function WorksSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const [_activeIndex, setActiveIndex] = useState(0);
  const [transitionData, setTransitionData] = useState<TransitionData | null>(
    null,
  );
  const [hoveredCard, setHoveredCard] = useState<{
    index: number;
    project: (typeof projects)[0];
  } | null>(null);
  const hoverStartRef = useRef<number | null>(null);
  const hoverRafRef = useRef<number | null>(null);
  const cardRefs = useRef<Map<number, HTMLElement>>(new Map());
  const router = useRouter();
  const { t: _t } = useLanguage();
  const { setInfinite } = useLenis();

  useEffect(() => {
    setInfinite(false);
    const timer = setTimeout(() => {
      ScrollTrigger.refresh();
    }, 100);
    return () => {
      clearTimeout(timer);
      setInfinite(true);
    };
  }, [setInfinite]);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const container = containerRef.current;
    if (!section || !container) return;

    const ctx = gsap.context(() => {
      const cards = gsap.utils.toArray<HTMLElement>(
        `.${styles.card}`,
        container,
      );
      const cardImages = gsap.utils.toArray<HTMLElement>(
        `.${styles.cardImage}`,
        container,
      );
      if (cards.length === 0) return;

      // Get card wrappers for accurate position measurement
      const cardWrappers = gsap.utils.toArray<HTMLElement>(
        `.${styles.cardWrapper}`,
        container,
      );

      // Calculate one set width using actual wrapper positions
      // Distance from first card of set 0 to first card of set 1
      const firstWrapperOfSet0 = cardWrappers[0];
      const firstWrapperOfSet1 = cardWrappers[projects.length];
      const oneSetWidth = firstWrapperOfSet1.offsetLeft - firstWrapperOfSet0.offsetLeft;

      // Get the actual position of first card of middle set (set 5, index 4*6=24)
      const middleSetIndex = projects.length * 4; // Start of set 5 (0-indexed: set 4)
      const firstWrapperOfMiddleSet = cardWrappers[middleSetIndex];
      const middleSetStart = firstWrapperOfMiddleSet.offsetLeft;

      // Scroll state
      let scrollX = 0;
      let targetScrollX = 0;
      let velocity = 0;
      let targetImageOffset = 0;
      let currentImageOffset = 0;

      // Mouse tracking
      let mouseX = 0;
      let mouseY = 0;
      let lastMouseX = 0;
      let lastMouseY = 0;
      let lastMouseTime = performance.now();
      let mouseVelocityX = 0;
      let mouseVelocityY = 0;

      // Per-card offset tracking
      const cardOffsets = cards.map(() => ({
        x: 0,
        y: 0,
        targetX: 0,
        targetY: 0,
      }));
      const imageOffsets = cardImages.map(() => ({
        x: 0,
        y: 0,
        targetX: 0,
        targetY: 0,
      }));

      // Mouse move handler
      const handleMouseMove = (e: MouseEvent) => {
        const currentTime = performance.now();
        const deltaTime = (currentTime - lastMouseTime) / 1000;

        mouseX = e.clientX;
        mouseY = e.clientY;

        if (deltaTime > 0) {
          mouseVelocityX = (e.clientX - lastMouseX) / deltaTime;
          mouseVelocityY = (e.clientY - lastMouseY) / deltaTime;
        }

        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        lastMouseTime = currentTime;
      };

      section.addEventListener("mousemove", handleMouseMove);

      // Wheel handler
      const handleWheel = (e: WheelEvent) => {
        e.preventDefault();
        targetScrollX += e.deltaY * 1.0;
      };

      section.addEventListener("wheel", handleWheel, { passive: false });

      // Initial position: show first card of Set B at left edge with margin
      const margin = 50;
      const initialX = -(middleSetStart - margin);
      gsap.set(container, { x: initialX });

      // Animation loop
      const smoothAnimation = () => {
        // Lerp scroll with easing
        const prevScrollX = scrollX;
        scrollX += (targetScrollX - scrollX) * 0.08;
        velocity = scrollX - prevScrollX;

        // Image parallax based on velocity
        targetImageOffset = gsap.utils.clamp(-25, 25, -velocity * 0.5);
        currentImageOffset += (targetImageOffset - currentImageOffset) * 0.06;

        // No wrap needed - 10 sets provide enough buffer for any practical scrolling
        // Direct position calculation
        const xPos = initialX - scrollX;

        gsap.set(container, { x: xPos });

        // Progress bar (use modulo just for display)
        const scrollInSet = ((scrollX % oneSetWidth) + oneSetWidth) % oneSetWidth;
        const progressInSet = scrollInSet / oneSetWidth;
        if (progressBarRef.current) {
          progressBarRef.current.style.width = `${progressInSet * 100}%`;
        }

        // Active card index
        const cardIndex = Math.floor(progressInSet * projects.length);
        setActiveIndex(Math.abs(cardIndex) % projects.length);

        // Decay mouse velocity (slower for smoother feel)
        mouseVelocityX *= 0.96;
        mouseVelocityY *= 0.96;

        // Calculate per-card offsets based on distance to mouse
        const effectRadius = 500;
        const maxOffset = 12;
        const sensitivity = 0.012;

        cards.forEach((card, i) => {
          const rect = card.getBoundingClientRect();
          const cardCenterX = rect.left + rect.width / 2;
          const cardCenterY = rect.top + rect.height / 2;

          const distX = mouseX - cardCenterX;
          const distY = mouseY - cardCenterY;
          const distance = Math.sqrt(distX * distX + distY * distY);

          const normalizedDist = Math.min(1, distance / effectRadius);
          const strength = Math.pow(1 - normalizedDist, 2);

          cardOffsets[i].targetX = gsap.utils.clamp(
            -maxOffset,
            maxOffset,
            mouseVelocityX * sensitivity * strength,
          );
          cardOffsets[i].targetY = gsap.utils.clamp(
            -maxOffset,
            maxOffset,
            mouseVelocityY * sensitivity * strength,
          );

          cardOffsets[i].x += (cardOffsets[i].targetX - cardOffsets[i].x) * 0.04;
          cardOffsets[i].y += (cardOffsets[i].targetY - cardOffsets[i].y) * 0.04;

          const hoverScale = parseFloat(card.dataset.hoverScale || "1");

          gsap.set(card, {
            x: cardOffsets[i].x,
            y: cardOffsets[i].y,
            scale: hoverScale,
          });

          if (cardImages[i]) {
            imageOffsets[i].targetX = cardOffsets[i].targetX * 1.3;
            imageOffsets[i].targetY = cardOffsets[i].targetY * 1.3;

            imageOffsets[i].x += (imageOffsets[i].targetX - imageOffsets[i].x) * 0.035;
            imageOffsets[i].y += (imageOffsets[i].targetY - imageOffsets[i].y) * 0.035;

            gsap.set(cardImages[i], {
              x: currentImageOffset + imageOffsets[i].x,
              y: imageOffsets[i].y,
              scale: 1.2,
            });
          }
        });

        requestAnimationFrame(smoothAnimation);
      };

      const rafId = requestAnimationFrame(smoothAnimation);


      // Cleanup on context revert
      return () => {
        cancelAnimationFrame(rafId);
        section.removeEventListener("mousemove", handleMouseMove);
        section.removeEventListener("wheel", handleWheel);
      };
    }, section);

    return () => {
      ctx.revert();
    };
  }, []);

  const handleCardClick = (
    e: React.MouseEvent<HTMLElement>,
    project: (typeof projects)[0],
  ) => {
    // Cancel any hover animation
    if (hoverRafRef.current) {
      cancelAnimationFrame(hoverRafRef.current);
    }

    // Clean up any existing hover state
    if (hoveredCard) {
      const prevCard = cardRefs.current.get(hoveredCard.index);
      if (prevCard) {
        delete prevCard.dataset.hoverScale;
        prevCard.classList.remove(styles.cardHovering);
      }
    }
    setHoveredCard(null);

    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();

    setTransitionData({
      id: project.id,
      image: project.image,
      rect,
    });

    // Navigate after animation
    setTimeout(() => {
      router.push(`/works/${project.id}`);
    }, 800);
  };

  const triggerTransition = (index: number, project: (typeof projects)[0]) => {
    const card = cardRefs.current.get(index);
    if (!card) return;

    const rect = card.getBoundingClientRect();
    setTransitionData({
      id: project.id,
      image: project.image,
      rect,
    });

    setTimeout(() => {
      router.push(`/works/${project.id}`);
    }, 800);
  };

  const handleCardHoverStart = (
    index: number,
    project: (typeof projects)[0],
  ) => {
    if (transitionData) return; // Already transitioning

    const card = cardRefs.current.get(index);
    if (!card) return;

    setHoveredCard({ index, project });
    hoverStartRef.current = performance.now();
    card.classList.add(styles.cardHovering);

    // Set data attribute for GSAP to read
    card.dataset.hoverScale = "1";

    const animateHover = () => {
      if (!hoverStartRef.current) return;

      const elapsed = performance.now() - hoverStartRef.current;
      const progress = Math.min(elapsed / LONG_HOVER_DURATION, 1);

      // Update data attribute that GSAP will read
      const hoverScale = 1 + progress * 0.5; // 1 to 1.5
      card.dataset.hoverScale = String(hoverScale);

      if (progress >= 1) {
        // Trigger page transition
        triggerTransition(index, project);
        setHoveredCard(null);
        hoverStartRef.current = null;
        delete card.dataset.hoverScale;
        card.classList.remove(styles.cardHovering);
        return;
      }

      hoverRafRef.current = requestAnimationFrame(animateHover);
    };

    hoverRafRef.current = requestAnimationFrame(animateHover);
  };

  const handleCardHoverEnd = () => {
    if (hoverRafRef.current) {
      cancelAnimationFrame(hoverRafRef.current);
    }

    // Reset the hover scale data attribute
    if (hoveredCard) {
      const card = cardRefs.current.get(hoveredCard.index);
      if (card) {
        delete card.dataset.hoverScale;
        card.classList.remove(styles.cardHovering);
      }
    }

    hoverStartRef.current = null;
    setHoveredCard(null);
  };


  return (
    <section className={styles.section} ref={sectionRef}>

      {/* Horizontal Scroll Container */}
      <div className={styles.scrollWrapper}>
        <div className={styles.horizontalContainer} ref={containerRef}>
          {allProjects.map((project, index) => {
            const layoutVariant = (index % 6) + 1;
            return (
              <div
                key={`${project.id}-${index}`}
                className={`${styles.cardWrapper} ${styles[`wrapper${project.size?.charAt(0).toUpperCase()}${project.size?.slice(1)}`]} ${styles[`layout${layoutVariant}`]}`}
              >
                {/* Floating Number */}
                <span className={styles.floatNumber}>{project.number}</span>

                {/* Floating Category */}
                <span className={styles.floatCategory}>{project.category}</span>

                {/* Card Image */}
                <article
                  ref={(el) => {
                    if (el) cardRefs.current.set(index, el);
                  }}
                  className={styles.card}
                  onClick={(e) => handleCardClick(e, project)}
                  onMouseEnter={() => handleCardHoverStart(index, project)}
                  onMouseLeave={handleCardHoverEnd}
                >
                  <div className={styles.cardImageWrapper}>
                    <Image
                      src={project.image}
                      alt={project.title}
                      fill
                      sizes="(max-width: 768px) 100vw, 500px"
                      className={styles.cardImage}
                    />
                  </div>
                  <div className={styles.cardFrame} />
                </article>

                {/* Floating Title */}
                <h3 className={styles.floatTitle}>{project.title}</h3>

                {/* Floating Subtitle */}
                <p className={styles.floatSubtitle}>{project.subtitle}</p>

                {/* Floating Year */}
                <span className={styles.floatYear}>{project.year}</span>

                {/* Floating Tech */}
                <div className={styles.floatTech}>
                  {project.tech.slice(0, 2).map((t: string, i: number) => (
                    <span key={i}>{t}</span>
                  ))}
                </div>

                {/* Floating Role */}
                <span className={styles.floatRole}>{project.role}</span>

                {/* Floating Description */}
                <p className={styles.floatDescription}>{project.description}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Page Transition Overlay */}
      <AnimatePresence>
        {transitionData && (
          <motion.div
            className={styles.transitionOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              className={styles.transitionImage}
              initial={{
                top: transitionData.rect.top,
                left: transitionData.rect.left,
                width: transitionData.rect.width,
                height: transitionData.rect.height,
                borderRadius: 8,
              }}
              animate={{
                top: 0,
                left: 0,
                width: "100vw",
                height: "100vh",
                borderRadius: 0,
              }}
              transition={{
                duration: 0.8,
                ease: [0.4, 0, 0.2, 1],
              }}
            >
              <Image
                src={transitionData.image}
                alt="Transition"
                fill
                sizes="100vw"
                style={{ objectFit: "cover" }}
                priority
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
