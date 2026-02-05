"use client";

import { motion } from "framer-motion";
import { CheckCircle, Sparkles } from "lucide-react";
import { fadeInUpScale, sparkle } from "@/animations";
import styles from "./SuccessMessage.module.css";
import Button from "@/components/ui/Button";
import { useContactStore } from "@/stores/contactStore";
import { useModalStore } from "@/stores/modalStore";

export default function SuccessMessage() {
  const { closeForm, resetForm } = useContactStore();
  const { isModalOpen, closeModal } = useModalStore();

  const handleClose = () => {
    if (isModalOpen) {
      closeModal();
    } else {
      closeForm(); // 폼 단독 닫기
    }

    resetForm();
  };

  return (
    <>
      <div className={styles.content}>
        <div className="flex flex-row w-full justify-center">
          <CheckCircle size={32} className={styles.icon} />
          <motion.h3 className={styles.title} variants={fadeInUpScale}>
            Message Sent!
            <motion.div
              variants={sparkle}
              className={styles.sparkle}
              initial="hidden"
              animate="visible"
            >
              <Sparkles size={16} className={styles.icon} />
            </motion.div>
          </motion.h3>
        </div>
        <motion.p className={styles.message} variants={fadeInUpScale}>
          감사합니다! 메시지를 성공적으로 전송했습니다.
          <br />
          빠른 시일 내에 답변드리겠습니다.
        </motion.p>
        <Button style="primary" onClick={handleClose}>
          확인
        </Button>
      </div>
    </>
  );
}
