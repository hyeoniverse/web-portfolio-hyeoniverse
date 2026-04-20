"use client";

import { useState, useEffect, useRef } from "react";
import Select from "@/components/ui/Select";
import { loadGoogleFont, validateGoogleFont } from "@/lib/loadGoogleFont";
import { getFontFamily } from "../_data/settingsConstants";
import styles from "../Settings.module.css";

interface FontSelectProps {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}

export default function FontSelect({ label, value, options, onChange }: FontSelectProps) {
  const isCustom = !!value && !options.includes(value);
  const [customInput, setCustomInput] = useState(isCustom ? value : "");
  const [validating, setValidating] = useState(false);
  const [validationError, setValidationError] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const effectiveOptions = isCustom
    ? [{ value, label: value }, ...options.map((f) => ({ value: f, label: f }))]
    : options.map((f) => ({ value: f, label: f }));

  // Debounced font search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = customInput.trim();
    if (q.length < 2) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/fonts/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setSuggestions(data.fonts ?? []);
        setShowSuggestions(true);
      } catch { setSuggestions([]); }
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [customInput]);

  const handlePresetChange = (v: string) => {
    setCustomInput("");
    setValidationError("");
    setSuggestions([]);
    setShowSuggestions(false);
    onChange(v);
  };

  const handleSuggestionClick = (fontName: string) => {
    setCustomInput(fontName);
    setValidationError("");
    setSuggestions([]);
    setShowSuggestions(false);
    loadGoogleFont(fontName);
    onChange(fontName);
  };

  const handleCustomApply = async () => {
    setShowSuggestions(false);
    const trimmed = customInput.trim();
    if (!trimmed) {
      if (!options.includes(value)) onChange(options[0]);
      setValidationError("");
      return;
    }
    if (trimmed === value) return;

    // Case-insensitive preset match
    const presetMatch = options.find((o) => o.toLowerCase() === trimmed.toLowerCase());
    if (presetMatch) {
      setCustomInput(presetMatch);
      onChange(presetMatch);
      setValidationError("");
      return;
    }

    // Normalize: title case each word
    const normalized = trimmed.replace(/\b\w/g, (c) => c.toUpperCase());

    setValidating(true);
    setValidationError("");
    const valid = await validateGoogleFont(normalized);
    setValidating(false);

    if (valid) {
      setCustomInput(normalized);
      loadGoogleFont(normalized);
      onChange(normalized);
    } else {
      setValidationError("Google Fonts에 없는 폰트입니다");
    }
  };

  return (
    <div className={styles.fieldRow}>
      <label className={styles.fieldLabel}>{label}</label>
      <div className={styles.fontSelectGroup}>
        <Select
          value={value}
          options={effectiveOptions}
          onChange={handlePresetChange}
          renderValue={(opt) => (
            <span style={{ fontFamily: getFontFamily(opt?.value ?? "") }}>
              {opt?.label ?? ""}
            </span>
          )}
          renderOption={(opt) => (
            <div className={styles.fontOption}>
              <span
                className={styles.fontSample}
                style={{ fontFamily: getFontFamily(opt.value) }}
              >
                가나다 Abc
              </span>
              <span className={styles.fontName}>{opt.label}</span>
            </div>
          )}
        />
        <div className={styles.fontCustomWrap}>
          <input
            type="text"
            className={`${styles.fontCustomInput} ${validationError ? styles.fieldInputError : ""}`}
            placeholder="직접 입력"
            value={customInput}
            onChange={(e) => { setCustomInput(e.target.value); setValidationError(""); }}
            onBlur={handleCustomApply}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (suggestions.length > 0) {
                  handleSuggestionClick(suggestions[0]);
                } else {
                  (e.target as HTMLInputElement).blur();
                }
              }
            }}
            style={customInput && !validationError ? { fontFamily: getFontFamily(customInput) } : undefined}
            disabled={validating}
          />
          {validating && <span className={styles.fontValidating}>확인 중…</span>}
          {showSuggestions && suggestions.length > 0 && (
            <div className={styles.fontSuggestions} data-lenis-prevent>
              {suggestions.map((font) => (
                <button
                  key={font}
                  type="button"
                  className={styles.fontSuggestionItem}
                  onMouseDown={(e) => { e.preventDefault(); handleSuggestionClick(font); }}
                >
                  {font}
                </button>
              ))}
            </div>
          )}
        </div>
        {validationError && <p className={styles.fontValidationMsg}>{validationError}</p>}
      </div>
    </div>
  );
}
