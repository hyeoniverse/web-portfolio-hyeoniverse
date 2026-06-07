"use client";

import { LinkPlugin } from "@platejs/link/react";
import { LinkElement } from "../elements";

/** 링크 */
export const LinkKit = [
  LinkPlugin.configure({
    render: { node: LinkElement },
  }),
];
