"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import type { SessionRollbackEntry } from "@/lib/types";
import { useI18n } from "@/hooks/useI18n";

const PAGE_SIZE = 8;

/** Normalize a stored preview to a single searchable/display string. */
export function normalizeRollbackText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** Filter rollback candidates by a whitespace-insensitive substring query. */
export function filterRollbackEntries(
  entries: SessionRollbackEntry[],
  query: string,
): SessionRollbackEntry[] {
  const normalizedQuery = normalizeRollbackText(query).toLocaleLowerCase();
  if (!normalizedQuery) return entries;
  return entries.filter((entry) => (
    `${entry.role} ${normalizeRollbackText(entry.text)}`
      .toLocaleLowerCase()
      .includes(normalizedQuery)
  ));
}

/** TUI parity: start on the current leaf, otherwise on the newest entry. */
export function getInitialRollbackIndex(
  entries: SessionRollbackEntry[],
  activeLeafId: string | null,
): number {
  if (entries.length === 0) return 0;
  const activeIndex = activeLeafId
    ? entries.findIndex((entry) => entry.id === activeLeafId)
    : -1;
  return activeIndex >= 0 ? activeIndex : entries.length - 1;
}

interface Props {
  entries: SessionRollbackEntry[];
  activeLeafId: string | null;
  open: boolean;
  onSelect: (entryId: string) => void;
  onClose: () => void;
}

/**
 * Keyboard-first session rollback picker opened by the double-Escape gesture
 * and the /tree command. Arrow keys move through the conversation, Enter
 * navigates the session back to the selected entry, Esc closes the picker.
 */
export function RollbackPicker({ entries, activeLeafId, open, onSelect, onClose }: Props) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const filteredEntries = useMemo(
    () => filterRollbackEntries(entries, query),
    [entries, query],
  );
  const [selectedIndex, setSelectedIndex] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setSelectedIndex(getInitialRollbackIndex(entries, activeLeafId));
    const focusTimer = window.setTimeout(() => searchRef.current?.focus(), 0);
    return () => window.clearTimeout(focusTimer);
  }, [open, entries, activeLeafId]);

  useEffect(() => {
    if (!open) return;
    setSelectedIndex((index) => Math.min(Math.max(0, index), Math.max(0, filteredEntries.length - 1)));
  }, [open, filteredEntries.length]);

  useEffect(() => {
    if (!open) return;
    const item = itemRefs.current[selectedIndex];
    if (item && typeof item.scrollIntoView === "function") {
      item.scrollIntoView({ block: "nearest" });
    }
  }, [open, selectedIndex, filteredEntries.length]);

  const handleSelect = useCallback((entryId: string) => {
    onSelect(entryId);
  }, [onSelect]);

  const handleQueryChange = useCallback((value: string) => {
    setQuery(value);
    // Searching selects the first match; clearing restores the current leaf.
    setSelectedIndex(value.trim() ? 0 : getInitialRollbackIndex(entries, activeLeafId));
  }, [entries, activeLeafId]);

  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      if (query) {
        handleQueryChange("");
        return;
      }
      onClose();
      return;
    }

    // Arrow/Enter navigation is owned by the search box and the option list.
    // Other controls (the close button) keep their native keyboard behavior.
    const target = event.target as HTMLElement;
    if (target !== searchRef.current && target.dataset?.rollbackOption === undefined) return;

    if (filteredEntries.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedIndex((index) => (index + 1) % filteredEntries.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedIndex((index) => (index - 1 + filteredEntries.length) % filteredEntries.length);
    } else if (event.key === "Home") {
      event.preventDefault();
      setSelectedIndex(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setSelectedIndex(filteredEntries.length - 1);
    } else if (event.key === "PageDown") {
      event.preventDefault();
      setSelectedIndex((index) => Math.min(filteredEntries.length - 1, index + PAGE_SIZE));
    } else if (event.key === "PageUp") {
      event.preventDefault();
      setSelectedIndex((index) => Math.max(0, index - PAGE_SIZE));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const selected = filteredEntries[selectedIndex];
      if (selected) handleSelect(selected.id);
    }
  }, [filteredEntries, selectedIndex, query, handleQueryChange, handleSelect, onClose]);

  if (!open) return null;

  return (
    <div
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "clamp(12px, 4vw, 40px)",
        background: "rgba(0,0,0,0.32)",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("i18n.rollbackTitle")}
        onKeyDown={handleKeyDown}
        style={{
          width: "min(680px, 100%)",
          maxHeight: "min(72vh, 640px)",
          display: "flex",
          flexDirection: "column",
          background: "var(--bg-panel)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          boxShadow: "0 18px 50px rgba(0,0,0,0.28)",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "14px 16px 10px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>
              {t("i18n.rollbackTitle")}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={t("i18n.close")}
              title={t("i18n.close")}
              style={{
                width: 26,
                height: 26,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 0,
                border: "none",
                borderRadius: 6,
                background: "none",
                color: "var(--text-muted)",
                cursor: "pointer",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <line x1="6" y1="6" x2="18" y2="18" />
                <line x1="18" y1="6" x2="6" y2="18" />
              </svg>
            </button>
          </div>
          <input
            ref={searchRef}
            value={query}
            onChange={(event) => handleQueryChange(event.target.value)}
            role="combobox"
            aria-expanded="true"
            aria-controls="omp-rollback-list"
            aria-activedescendant={filteredEntries[selectedIndex] ? `omp-rollback-option-${selectedIndex}` : undefined}
            aria-label={t("i18n.rollbackSearch")}
            placeholder={t("i18n.rollbackSearch")}
            style={{
              width: "100%",
              marginTop: 10,
              padding: "7px 10px",
              border: "1px solid var(--border)",
              borderRadius: 7,
              background: "var(--bg)",
              color: "var(--text)",
              outline: "none",
              fontSize: 13,
            }}
          />
        </div>

        <div
          ref={listRef}
          id="omp-rollback-list"
          role="listbox"
          aria-label={t("i18n.rollbackTitle")}
          style={{ overflowY: "auto", padding: 6, minHeight: 80 }}
        >
          {filteredEntries.length === 0 ? (
            <div style={{ padding: "18px 10px", textAlign: "center", color: "var(--text-dim)", fontSize: 12.5 }}>
              {t("i18n.noRollbackEntries")}
            </div>
          ) : (
            filteredEntries.map((entry, index) => {
              const active = index === selectedIndex;
              const isCurrentLeaf = entry.id === activeLeafId;
              return (
                <button
                  key={entry.id}
                  ref={(node) => {
                    itemRefs.current[index] = node;
                  }}
                  id={`omp-rollback-option-${index}`}
                  type="button"
                  role="option"
                  data-rollback-option=""
                  aria-selected={active}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => handleSelect(entry.id)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 9,
                    padding: "8px 9px",
                    border: "none",
                    borderRadius: 8,
                    background: active ? "var(--bg-selected)" : "none",
                    color: "var(--text)",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <span
                    style={{
                      flexShrink: 0,
                      minWidth: 20,
                      height: 20,
                      padding: "0 5px",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 5,
                      fontSize: 10,
                      fontWeight: 700,
                      fontFamily: "var(--font-mono)",
                      color: entry.role === "user" ? "var(--accent)" : "var(--text-dim)",
                      background: entry.role === "user" ? "rgba(37,99,235,0.10)" : "var(--bg-hover)",
                      border: `1px solid ${entry.role === "user" ? "rgba(37,99,235,0.22)" : "var(--border)"}`,
                    }}
                  >
                    {entry.role === "user" ? "U" : "A"}
                  </span>
                  <span style={{ minWidth: 0, flex: 1, fontSize: 12.5, lineHeight: 1.45 }}>
                    <span
                      style={{
                        display: "-webkit-box",
                        WebkitBoxOrient: "vertical",
                        WebkitLineClamp: 2,
                        overflow: "hidden",
                        overflowWrap: "anywhere",
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {normalizeRollbackText(entry.text) || (entry.role === "assistant" ? "(no content)" : "(no text)")}
                    </span>
                    {isCurrentLeaf && (
                      <span style={{ display: "inline-block", marginTop: 4, fontSize: 10, color: "var(--accent)" }}>
                        ● {t("i18n.rollbackCurrent")}
                      </span>
                    )}
                  </span>
                  <span style={{ flexShrink: 0, alignSelf: "center", fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--text-dim)" }}>
                    {index + 1}/{filteredEntries.length}
                  </span>
                </button>
              );
            })
          )}
        </div>

        <div style={{ padding: "8px 12px", borderTop: "1px solid var(--border)", color: "var(--text-dim)", fontSize: 11, textAlign: "center" }}>
          {t("i18n.rollbackHint")}
        </div>
      </div>
    </div>
  );
}
