import { mkdirSync, readFileSync, statSync } from "fs";
import { join } from "path";
import { getAgentDir } from "@oh-my-pi/pi-coding-agent";
import { writePrivateFileAtomicSync } from "./atomic-file";

/**
 * omp-web specific preferences (not part of omp's own settings schema).
 *
 * Stored next to the agent config (~/.omp/agent/) so they survive restarts
 * and are shared by every omp-web instance pointed at the same agent dir,
 * following the same convention as lib/project-trust.ts.
 */

const PREFS_FILE = "omp-web-preferences.json";

export interface OmpWebPreferences {
  /**
   * When true (default), each git worktree top-level keeps its own project
   * identity in the sidebar instead of collapsing into the main repo's
   * project. Sibling worktrees like `drama` / `drama-2.5` are then managed
   * as separate projects with their own session groups.
   */
  splitWorktreeProjects: boolean;
}

const DEFAULTS: OmpWebPreferences = {
  splitWorktreeProjects: true,
};

declare global {
  var __ompWebPreferencesCache:
    | { prefs: OmpWebPreferences; mtimeMs: number; size: number }
    | undefined;
}

function prefsFilePath(): string {
  return join(getAgentDir(), PREFS_FILE);
}

/**
 * Read preferences from disk. The result is cached on globalThis (hot-reload
 * safe) and invalidated by comparing file mtime/size, so external edits are
 * picked up without an explicit invalidation call.
 */
export function readPreferences(): OmpWebPreferences {
  const filePath = prefsFilePath();
  let stat: { mtimeMs: number; size: number } | null = null;
  try {
    stat = statSync(filePath);
  } catch {
    stat = null;
  }

  const cached = globalThis.__ompWebPreferencesCache;
  if (
    cached
    && stat
    && cached.mtimeMs === stat.mtimeMs
    && cached.size === stat.size
  ) {
    return cached.prefs;
  }

  let parsed: unknown = null;
  if (stat) {
    try {
      parsed = JSON.parse(readFileSync(filePath, "utf8"));
    } catch {
      parsed = null;
    }
  }

  const prefs: OmpWebPreferences = { ...DEFAULTS };
  if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
    const record = parsed as Record<string, unknown>;
    if (typeof record.splitWorktreeProjects === "boolean") {
      prefs.splitWorktreeProjects = record.splitWorktreeProjects;
    }
  }

  globalThis.__ompWebPreferencesCache = {
    prefs,
    mtimeMs: stat?.mtimeMs ?? 0,
    size: stat?.size ?? 0,
  };
  return prefs;
}

export function writePreferences(prefs: Partial<OmpWebPreferences>): OmpWebPreferences {
  const next = { ...readPreferences(), ...prefs };
  mkdirSync(getAgentDir(), { recursive: true });
  writePrivateFileAtomicSync(prefsFilePath(), `${JSON.stringify(next, null, 2)}\n`);
  // Re-read through the same path so the cache holds the on-disk stat.
  globalThis.__ompWebPreferencesCache = undefined;
  return readPreferences();
}
