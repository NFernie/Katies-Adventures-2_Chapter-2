import { readFileSync } from "node:fs";

export type SourceList = {
  allowedApiHosts: string[];
  deniedHosts: string[];
  signedOffScrapeUrls: string[];
  wgerExercisePathPrefixes: string[];
  wgerForbiddenPathPrefixes: string[];
};

const SOURCES_PATH = new URL("./sources.json", import.meta.url);

export function loadSourceList(): SourceList {
  return JSON.parse(readFileSync(SOURCES_PATH, "utf8")) as SourceList;
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

export function assertScrapeAllowed(
  url: string,
  sources: SourceList = loadSourceList(),
): void {
  const host = hostnameOf(url);
  if (sources.deniedHosts.some((row) => hostMatches(host, row))) {
    throw new Error(`denied source: ${host}`);
  }
  if (!sources.signedOffScrapeUrls.includes(url)) {
    throw new Error(
      "no HTML scrape sources are signed off; write a first-party draft instead",
    );
  }
}
