"use client";

import { Highlight, themes } from "prism-react-renderer";
import { useTheme } from "@/providers/ThemeProvider";
import styles from "./AboutSection.module.css";

interface CodeHighlightProps {
  code: string;
  language: string;
}

export default function CodeHighlight({ code, language }: CodeHighlightProps) {
  const { theme } = useTheme();
  const prismTheme = theme === "dark" ? themes.nightOwl : themes.nightOwlLight;

  return (
    <Highlight theme={prismTheme} code={code} language={language}>
      {({ tokens, getLineProps, getTokenProps }) => (
        <pre className={styles.codeBlock} style={{ background: "transparent" }}>
          <code>
            {tokens.map((line, i) => (
              <div key={i} {...getLineProps({ line })}>
                {line.map((token, key) => (
                  <span key={key} {...getTokenProps({ token })} />
                ))}
              </div>
            ))}
          </code>
        </pre>
      )}
    </Highlight>
  );
}
