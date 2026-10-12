/* CMS 데모 여섯 개 — 탭 하나에 하나씩 띄운다. 모두 props 없이 그리고, 화면에 들어오면 짧은 대본을 한 번 돌린다 */
import type { ComponentType } from "react";
import type { TabCopy } from "./data";
import { tabs } from "./data";
import AutosaveDemo from "./AutosaveDemo";
import LifecycleDemo from "./LifecycleDemo";
import CommentsDemo from "./CommentsDemo";
import InviteDemo from "./InviteDemo";
import RolesDemo from "./RolesDemo";
import KitchenDemo from "./KitchenDemo";

type CmsDemoId = keyof typeof tabs;

export interface CmsDemo extends TabCopy {
  id: CmsDemoId;
  Component: ComponentType;
}

export const cmsDemos: CmsDemo[] = [
  { id: "autosave", ...tabs.autosave, Component: AutosaveDemo },
  { id: "lifecycle", ...tabs.lifecycle, Component: LifecycleDemo },
  { id: "comments", ...tabs.comments, Component: CommentsDemo },
  { id: "invite", ...tabs.invite, Component: InviteDemo },
  { id: "roles", ...tabs.roles, Component: RolesDemo },
  { id: "kitchen", ...tabs.kitchen, Component: KitchenDemo },
];
