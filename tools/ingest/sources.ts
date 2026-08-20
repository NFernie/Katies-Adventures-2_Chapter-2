import { readFileSync } from "node:fs";

export type SourceList = {
  allowedApiHosts: string[];
  deniedHosts: string[];
  signedOffScrapeUrls: string[];
  signedOffScrapeUrlPrefixes: string[];
  wgerExercisePathPrefixes: string[];
  wgerForbiddenPathPrefixes: string[];
};

const SOURCES_PATH = new URL("./sources.json", import.meta.url);

export function loadSourceList(): SourceList {
  const raw = JSON.parse(readFileSync(SOURCES_PATH, "utf8")) as SourceList;
  return {
    ...raw,
    signedOffScrapeUrls: raw.signedOffScrapeUrls ?? [],
    signedOffScrapeUrlPrefixes: raw.signedOffScrapeUrlPrefixes ?? [],
  };
}

function hostnameOf(url: string): string {
  return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
}

function pathOf(url: string): string {
  return new URL(url).pathname.toLowerCase();
}

function hostMatches(host: string, listed: string): boolean {
  const needle = listed.toLowerCase().replace(/^www\./, "");
  return host === needle || host.endsWith(`.${needle}`);
}

/** Wayback `/web/{stamp}/{original}` → original URL (query included). */
export function originalScrapeUrl(url: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }
  const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
  if (host !== "web.archive.org") return url;
  const match = parsed.pathname.match(/^\/web\/\d+[a-z_]*\/(https?:\/.+)$/i);
  if (!match?.[1]) return url;
  return `${match[1]}${parsed.search}`;
}

function normalizeHttpUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    const href = parsed.toString();
    return href.endsWith("/") && parsed.pathname === "/" ? href : href;
  } catch {
    return url;
  }
}

function startsWithPrefix(url: string, prefix: string): boolean {
  const target = normalizeHttpUrl(url).toLowerCase();
  const needle = prefix.toLowerCase();
  return target.startsWith(needle);
}

function isDeniedUrl(url: string, sources: SourceList): boolean {
  try {
    return sources.deniedHosts.some((row) => hostMatches(hostnameOf(url), row));
  } catch {
    return false;
  }
}

export function assertSourceAllowed(
  url: string,
  sources: SourceList = loadSourceList(),
): void {
  const host = hostnameOf(url);
  const path = pathOf(url);
  if (sources.deniedHosts.some((row) => hostMatches(host, row))) {
    throw new Error(`denied source: ${host}`);
  }
  if (hostMatches(host, "wger.de")) {
    if (sources.wgerForbiddenPathPrefixes.some((prefix) => path.startsWith(prefix))) {
      throw new Error("wger is exercises only");
    }
    if (!sources.wgerExercisePathPrefixes.some((prefix) => path.startsWith(prefix))) {
      throw new Error("wger is exercises only");
    }
    return;
  }
  if (sources.allowedApiHosts.some((row) => hostMatches(host, row))) return;
  throw new Error(`unsigned source: ${host}`);
}

export function isScrapeSignedOff(
  url: string,
  sources: SourceList = loadSourceList(),
): boolean {
  const original = originalScrapeUrl(url);
  if (isDeniedUrl(url, sources) || isDeniedUrl(original, sources)) return false;
  if (sources.signedOffScrapeUrls.includes(url) || sources.signedOffScrapeUrls.includes(original)) {
    return true;
  }
  return sources.signedOffScrapeUrlPrefixes.some(
    (prefix) => startsWithPrefix(original, prefix) || startsWithPrefix(url, prefix),
  );
}

export function assertScrapeAllowed(
  url: string,
  sources: SourceList = loadSourceList(),
): void {
  const original = originalScrapeUrl(url);
  if (isDeniedUrl(url, sources) || isDeniedUrl(original, sources)) {
    const host = hostnameOf(isDeniedUrl(url, sources) ? url : original);
    throw new Error(`denied source: ${host}`);
  }
  if (isScrapeSignedOff(url, sources)) return;
  throw new Error(
    "no HTML scrape sources are signed off; write a first-party draft instead",
  );
}
