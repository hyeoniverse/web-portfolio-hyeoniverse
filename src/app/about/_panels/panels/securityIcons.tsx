import { Database, Shield, SquareCheck, Lock, Rows2, Route, Fingerprint, Key, Crown } from "@/components/icons";

/* 보안 항목 아이콘 — 관리자 About 스튜디오 프리뷰에서 쓴다 */
export const securityIcons: Record<string, React.ReactNode> = {
  db: <Database size="1em" />,
  shield: <Shield size="1em" />,
  check: <SquareCheck size="1em" />,
  lock: <Lock size="1em" />,
  rows: <Rows2 size="1em" />,
  route: <Route size="1em" />,
  fingerprint: <Fingerprint size="1em" />,
  key: <Key size="1em" />,
  crown: <Crown size="1em" />,
};
