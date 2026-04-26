"use client";

import { motion } from "framer-motion";
import { Paperclip } from "lucide-react";
import T from "@/components/ui/T";
import styles from "./ContactDrawer.module.css";

interface SubmittedData {
  name: string;
  email: string;
  title: string;
  message: string;
  fileName: string;
}

interface ContactSuccessViewProps {
  submittedData: SubmittedData;
  resetForm: (e?: React.MouseEvent) => void;
}

const clipEase = [0.65, 0, 0.35, 1] as const;

export default function ContactSuccessView({
  submittedData,
  resetForm,
}: ContactSuccessViewProps) {
  return (
    <motion.div
      key="success-view"
      className={styles.successView}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <motion.div
        className={styles.successLabel}
        variants={{
          hidden: { opacity: 0, y: 10 },
          visible: { opacity: 1, y: 0 },
          exit: { opacity: 0, y: -10 },
        }}
        transition={{ duration: 0.4, delay: 0.1, ease: clipEase }}
      >
        <T k="contact.drawer.preview" />
      </motion.div>

      <motion.div
        className={styles.successHeader}
        variants={{
          hidden: { clipPath: "inset(100% 0 0 0)", y: 30 },
          visible: { clipPath: "inset(0% 0 0 0)", y: 0 },
          exit: { clipPath: "inset(0 0 100% 0)", y: -20 },
        }}
        transition={{ duration: 0.5, delay: 0.15, ease: clipEase }}
      >
        <span className={styles.successFrom}>{submittedData.name}</span>
        <span className={styles.successEmail}>{submittedData.email}</span>
      </motion.div>

      {submittedData.title && (
        <motion.div
          className={styles.successTitle}
          variants={{
            hidden: { clipPath: "inset(100% 0 0 0)", y: 20 },
            visible: { clipPath: "inset(0% 0 0 0)", y: 0 },
            exit: { clipPath: "inset(0 0 100% 0)", y: -15 },
          }}
          transition={{ duration: 0.5, delay: 0.2, ease: clipEase }}
        >
          {submittedData.title}
        </motion.div>
      )}

      <motion.div
        className={styles.successDivider}
        variants={{
          hidden: { scaleX: 0, opacity: 0 },
          visible: { scaleX: 1, opacity: 1 },
          exit: { scaleX: 0, opacity: 0 },
        }}
        transition={{ duration: 0.6, delay: 0.25, ease: clipEase }}
      />

      <motion.div
        className={styles.successMessageWrapper}
        variants={{
          hidden: { clipPath: "inset(0 0 100% 0)", y: 40 },
          visible: { clipPath: "inset(0 0 0% 0)", y: 0 },
          exit: { clipPath: "inset(100% 0 0 0)", y: -30 },
        }}
        transition={{ duration: 0.6, delay: 0.3, ease: clipEase }}
      >
        <span className={styles.successMessageLabel}>
          <T k="contact.drawer.messageLabel" />
        </span>
        <p className={styles.successMessage}>{submittedData.message}</p>
      </motion.div>

      {submittedData.fileName && (
        <motion.div
          className={styles.successAttachment}
          variants={{
            hidden: { scale: 0.8, opacity: 0, filter: "blur(10px)" },
            visible: { scale: 1, opacity: 1, filter: "blur(0px)" },
            exit: { scale: 0.8, opacity: 0, filter: "blur(10px)" },
          }}
          transition={{ duration: 0.4, delay: 0.35, ease: clipEase }}
        >
          <Paperclip strokeWidth={1.5} />
          {submittedData.fileName}
        </motion.div>
      )}

      <motion.button
        type="button"
        className={styles.successBtn}
        onClick={resetForm}
        variants={{
          hidden: { y: 40, opacity: 0, scale: 0.9 },
          visible: { y: 0, opacity: 1, scale: 1 },
          exit: { y: 30, opacity: 0, scale: 0.95 },
        }}
        transition={{ duration: 0.5, delay: 0.4, ease: clipEase }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <T k="contact.send" />
      </motion.button>
    </motion.div>
  );
}
