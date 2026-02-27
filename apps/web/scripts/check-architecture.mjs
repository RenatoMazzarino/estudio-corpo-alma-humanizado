import fs from "node:fs";
import path from "node:path";

const ROOT = globalThis.process.cwd();
const TARGET_DIRS = ["app", "components", "lib", "src"];
const FILE_EXTENSIONS = new Set([".ts", ".tsx"]);
const MAX_RELATIVE_PARENT_DEPTH = 6;

const FORBIDDEN_UNKNOWN_CAST_PATHS = [
  path.join("src", "modules", "payments"),
  path.join("src", "modules", "appointments"),
  path.join("app", "(dashboard)", "atendimento", "[id]"),
];

/** @returns {string[]} */
function collectFiles() {
  /** @type {string[]} */
  const files = [];

  /** @param {string} dir */
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
      const absolute = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(absolute);
        continue;
      }
      if (FILE_EXTENSIONS.has(path.extname(entry.name))) {
        files.push(absolute);
      }
    }
  };

  for (const target of TARGET_DIRS) {
    walk(path.join(ROOT, target));
  }

  return files;
}

/** @param {string} absoluteFilePath */
function toRepoRelative(absoluteFilePath) {
  return path.relative(ROOT, absoluteFilePath).split(path.sep).join("/");
}

/** @param {string} relativePath */
function isCriticalUnknownCastPath(relativePath) {
  const normalized = relativePath.split("/").join(path.sep);
  return FORBIDDEN_UNKNOWN_CAST_PATHS.some((criticalPath) => normalized.includes(criticalPath));
}

/** @param {string} specifier */
function getParentDepth(specifier) {
  const matches = specifier.match(/\.\.\//g);
  return matches ? matches.length : 0;
}

/** @type {string[]} */
const violations = [];
const files = collectFiles();

for (const absoluteFilePath of files) {
  const relativePath = toRepoRelative(absoluteFilePath);
  const content = fs.readFileSync(absoluteFilePath, "utf8");
  const lines = content.split(/\r?\n/);

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const lineNo = i + 1;

    const importMatches = [
      ...line.matchAll(/from\s+["']([^"']+)["']/g),
      ...line.matchAll(/import\s*\(\s*["']([^"']+)["']\s*\)/g),
    ];

    for (const match of importMatches) {
      const specifier = match[1];
      if (!specifier.startsWith(".")) continue;
      const depth = getParentDepth(specifier);
      if (depth > MAX_RELATIVE_PARENT_DEPTH) {
        violations.push(
          `${relativePath}:${lineNo} import relativo profundo (${depth} níveis): "${specifier}" (máximo permitido: ${MAX_RELATIVE_PARENT_DEPTH})`
        );
      }
    }

    if (isCriticalUnknownCastPath(relativePath) && line.includes("as unknown as")) {
      violations.push(
        `${relativePath}:${lineNo} uso proibido de "as unknown as" em caminho crítico.`
      );
    }
  }
}

if (violations.length > 0) {
  console.error("Falha no lint arquitetural:");
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  globalThis.process.exit(1);
}

console.log("Lint arquitetural: OK");
