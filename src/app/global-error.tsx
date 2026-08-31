"use client";

import { useEffect } from "react";
import Pressable from "@/components/ui/Pressable";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error("Global Error:", error);
  }, [error]);

  return (
    <html lang="ko">
      <body>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "100vh",
            padding: "2rem",
            background: "#f8f6f0",
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              maxWidth: "500px",
            }}
          >
            {/* Icon */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                width: "80px",
                height: "80px",
                marginBottom: "2rem",
                border: "2px solid #212529",
                borderRadius: "50%",
              }}
            >
              <span
                style={{
                  fontSize: "3rem",
                  fontWeight: "300",
                  color: "#212529",
                  lineHeight: 1,
                }}
              >
                !
              </span>
            </div>

            {/* Title */}
            <h1
              style={{
                margin: "0 0 1rem",
                fontSize: "2rem",
                fontWeight: "400",
                color: "#212529",
                letterSpacing: "-0.02em",
              }}
            >
              Critical Error
            </h1>

            {/* Description */}
            <p
              style={{
                margin: "0 0 2rem",
                fontSize: "1rem",
                color: "#6b7280",
                lineHeight: 1.6,
              }}
            >
              A critical error occurred. The application needs to be reloaded.
            </p>

            {/* Actions */}
            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
              <Pressable
                onClick={reset}
                style={{
                  padding: "0.75rem 2rem",
                  border: "none",
                  borderRadius: "9999px",
                  background: "#212529",
                  fontSize: "0.875rem",
                  fontWeight: "500",
                  color: "#fff",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                }}
              >
                Try Again
              </Pressable>
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a
                href="/"
                style={{
                  padding: "0.75rem 2rem",
                  border: "1px solid #ced4da",
                  borderRadius: "9999px",
                  background: "transparent",
                  fontSize: "0.875rem",
                  fontWeight: "500",
                  color: "#212529",
                  textDecoration: "none",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                }}
              >
                Go Home
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
