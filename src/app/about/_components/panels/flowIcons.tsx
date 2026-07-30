import type { ReactNode } from "react";
import {
  Globe,
  FileText,
  LayoutGrid,
  User,
  Shield,
  Settings,
  Sun,
  Mail,
  MessageSquare,
} from "@/components/icons";

const ICON_PROPS = { size: 20, strokeWidth: 1.5 } as const;

export const FLOW_ICONS: Record<string, ReactNode> = {
  Visitor: <Globe {...ICON_PROPS} />,
  Posts: <FileText {...ICON_PROPS} />,
  Works: <LayoutGrid {...ICON_PROPS} />,
  Profile: <User {...ICON_PROPS} />,
  Admin: <Shield {...ICON_PROPS} />,
  "Admin/Settings": <Settings {...ICON_PROPS} />,
  "Admin/Posts · Works": <Shield {...ICON_PROPS} />,
  "Admin/Settings/Appearance": <Sun {...ICON_PROPS} />,
  Contact: <Mail {...ICON_PROPS} />,
  Comment: <MessageSquare {...ICON_PROPS} />,
};
