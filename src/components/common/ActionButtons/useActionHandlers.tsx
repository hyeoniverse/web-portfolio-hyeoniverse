"use client";

import { useState, useRef, useCallback, ReactNode } from "react";
import { Mail } from "lucide-react";

import { SoundType } from "@/types";
import ContactForm from "@/components/common/ContactForm/ContactForm";
import { useAppStore } from "@/stores/appStore";
import { scrollToBottom, scrollToTop } from "@/utils/index";

interface Props {
  playSound: (sound: SoundType) => void;
  openModal: (
    content: React.ReactNode,
    options?: {
      header?: { icon?: ReactNode; title?: string };
      width?: string;
    }
  ) => void;
}

export function useActionHandlers({ playSound, openModal }: Props) {
  const { toggleTheme } = useAppStore();

  const [showCopyFeedback, setShowCopyFeedback] = useState(false);
  const feedbackTimerRef = useRef<NodeJS.Timeout | null>(null);

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      playSound("success");
      setShowCopyFeedback(true);
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = setTimeout(
        () => setShowCopyFeedback(false),
        2000
      );
    } catch {
      playSound("error");
    }
  }, [playSound]);

  const openGithub = useCallback(() => {
    playSound("click");
    window.open("https://github.com", "_blank");
  }, [playSound]);

  const openContactModal = useCallback(() => {
    playSound("click");
    openModal(<ContactForm />, {
      header: {
        icon: <Mail size={20} />,
        title: "Contact",
      },
      width: "500px",
    });
  }, [playSound, openModal]);

  const handleThemeToggle = useCallback(() => {
    playSound("click");
    toggleTheme();
  }, [playSound, toggleTheme]);

  return {
    showCopyFeedback,
    scrollToBottom,
    scrollToTop,
    copyLink,
    openGithub,
    openContactModal,
    handleThemeToggle,
  };
}
