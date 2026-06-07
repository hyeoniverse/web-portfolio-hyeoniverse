"use client";

import {
  PlateElement,
  PlateLeaf,
  type PlateElementProps,
  type PlateLeafProps,
} from "platejs/react";
import { CodeBlockPlugin, CodeLinePlugin, CodeSyntaxPlugin } from "@platejs/code-block/react";
import { CodeBlockRules } from "@platejs/code-block";
import { common, createLowlight } from "lowlight";
import { CodeBlockElement } from "../elements";

const lowlight = createLowlight(common);

/** 코드 블록 — lowlight 기반 syntax highlighting */
export const CodeBlockKit = [
  CodeBlockPlugin.configure({
    options: { lowlight, defaultLanguage: "auto" },
    render: { node: CodeBlockElement },
    inputRules: [CodeBlockRules.markdown({ on: "break" })], // ``` + Enter → 코드블록
  }).configurePlugin(CodeLinePlugin, {
    render: {
      node: (props: PlateElementProps) => <PlateElement {...props} as="div" />,
    },
  }).configurePlugin(CodeSyntaxPlugin, {
    render: {
      node: (props: PlateLeafProps) => {
        const leaf = props.leaf as Record<string, unknown>;
        const cls = (leaf.className as string) || undefined;
        return <PlateLeaf {...props} as="span" className={cls} />;
      },
    },
  }),
];
