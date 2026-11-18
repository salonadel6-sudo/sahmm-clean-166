const STATIC_REDIRECT_RULE = /^(\s*)RewriteRule\s+(\S+)\s+(\S+)\s+\[R=301,L\]$/u;

export function getHostingerRedirectDestination(targetPath) {
  const target = String(targetPath || "");
  if (!/[^\x00-\x7F]/u.test(target)) {
    return { destination: target, flags: "[R=301,L]" };
  }
  if (!target.startsWith("/") || /[?#\s]/u.test(target)) {
    throw new Error(`Unsafe static redirect target: ${target}`);
  }
  const encodedTarget = Buffer.from(target, "utf8").toString("base64url");
  return {
    destination: `/legacy-redirect.php?target=${encodedTarget}`,
    flags: "[END]",
  };
}

export function createHostingerRedirectRule(pattern, targetPath) {
  const { destination, flags } = getHostingerRedirectDestination(targetPath);
  return `RewriteRule ${pattern} ${destination} ${flags}`;
}

export function rewriteUnicodeHostingerRedirectTargets(contents) {
  return String(contents)
    .split("\n")
    .map((line) => {
      const match = line.match(STATIC_REDIRECT_RULE);
      if (!match || !/[^\x00-\x7F]/u.test(match[3]) || match[3].includes("$")) {
        return line;
      }
      return `${match[1]}${createHostingerRedirectRule(match[2], match[3])}`;
    })
    .join("\n");
}
