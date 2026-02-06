"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ChevronUp,
  Copy,
  ClipboardCheck,
  Github,
  MoreHorizontal,
  Sun,
  Moon,
  Mail,
} from "lucide-react";

import { useAppStore } from "@/stores/appStore";
import { useSoundManager } from "@/hooks/useSoundManager";
import { useModalStore } from "@/stores/modalStore";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useActionHandlers } from "@/components/common/ActionButtons/useActionHandlers";
import { expandedMenuVariants, themeToggleRotate } from "@/animations";

import styles from "./ActionButtons.module.css";
import ActionButton from "@/components/common/ActionButtons/ActionButton";

export default function ActionButtons() {
  const [isExpanded, setIsExpanded] = useState(false);
  const { isTouch } = useIsMobile();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const moreWrapperRef = useRef<HTMLDivElement>(null); // More 버튼 wrapper ref

  const { theme, matchThemeWithSystem } = useAppStore();
  const { openModal } = useModalStore();
  const { playSound } = useSoundManager();

  useEffect(() => {
    matchThemeWithSystem();
  }, [matchThemeWithSystem]);

  const {
    showCopyFeedback,
    scrollToBottom,
    scrollToTop,
    copyLink: baseCopyLink,
    openGithub,
    openContactModal,
    handleThemeToggle,
  } = useActionHandlers({ playSound, openModal });

  /* 모바일용 copyLink (1초 후 닫기) */
  const copyLink = useCallback(async () => {
    await baseCopyLink();
    if (isTouch) {
      setTimeout(() => setIsExpanded(false), 1000);
    }
  }, [baseCopyLink, isTouch]);

  /* 외부 클릭 감지 (모바일 전용) */
  useEffect(() => {
    if (!isTouch || !isExpanded) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        moreWrapperRef.current &&
        !moreWrapperRef.current.contains(e.target as Node)
      ) {
        setIsExpanded(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [isTouch, isExpanded]);

  /* Hover 상태 관리 (데스크탑 전용) */
  const handleMouseEnter = () => {
    if (isTouch) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsExpanded(true);
  };
  const handleMouseLeave = () => {
    if (isTouch) return;
    timeoutRef.current = setTimeout(() => setIsExpanded(false), 300);
  };

  /* 모바일에서는 버튼을 클릭해서 토글 */
  const handleToggleExpand = () => {
    if (isTouch) {
      setIsExpanded((prev) => !prev);
    }
  };

  /* 확장 버튼 정의 */
  const expandedButtons = useMemo(
    () => [
      { title: "GitHub", icon: <Github size={20} />, onClick: openGithub },
      {
        title: "Contact Me",
        icon: <Mail size={20} />,
        onClick: openContactModal,
      },
      {
        title: "Copy Link",
        icon: showCopyFeedback ? (
          <ClipboardCheck size={20} />
        ) : (
          <Copy size={20} />
        ),
        onClick: copyLink, // <-- 수정된 copyLink 사용
        isActive: showCopyFeedback,
      },
      {
        title: "Toggle Theme",
        icon: (
          <motion.div
            initial={false}
            animate={themeToggleRotate.animate(theme === "dark")}
          >
            {theme === "dark" ? <Moon size={20} /> : <Sun size={20} />}
          </motion.div>
        ),
        onClick: handleThemeToggle,
      },
      {
        title: "Scroll to Top",
        icon: <ChevronUp size={20} />,
        onClick: scrollToTop,
      },
    ],
    [
      openGithub,
      openContactModal,
      showCopyFeedback,
      copyLink,
      theme,
      handleThemeToggle,
      scrollToTop,
    ]
  );

  return (
    <div className={styles.actionButtons}>
      {/* More 버튼 + 확장 메뉴 */}
      <div
        ref={moreWrapperRef}
        className={styles.moreWrapper}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleToggleExpand} // 모바일에서는 클릭으로 토글
      >
        <AnimatePresence>
          {isExpanded ? (
            <motion.div
              className={styles.expandedButtons}
              variants={expandedMenuVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              {expandedButtons.map(({ title, icon, onClick, isActive }) => (
                <ActionButton
                  key={title}
                  title={title}
                  onClick={onClick}
                  isActive={!!isActive}
                >
                  {icon}
                </ActionButton>
              ))}
            </motion.div>
          ) : (
            <ActionButton title="More">
              <MoreHorizontal size={20} />
            </ActionButton>
          )}
        </AnimatePresence>
      </div>

      {/* Scroll To Bottom */}
      <ActionButton title="Scroll to Bottom" onClick={scrollToBottom}>
        <ChevronDown size={20} />
      </ActionButton>
    </div>
  );
}
