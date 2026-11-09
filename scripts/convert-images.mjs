// Converts every raster image in raw-images/ to .webp and writes it into
// public/images/, preserving any subfolder structure.
//
// Usage:
//   npm run images:webp            # quality 82 (default)
//   npm run images:webp -- --quality=90

import { readdir, mkdir, stat } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import sharp from "sharp";

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, "raw-images");
const OUT_DIR = path.join(ROOT, "public", "images");
const CONVERTIBLE = new Set([".png", ".jpg", ".jpeg", ".tiff", ".gif", ".avif"]);

const qualityArg = process.argv.find((a) => a.startsWith("--quality="));
const quality = qualityArg ? Number(qualityArg.split("=")[1]) : 82;

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(full)));
    } else {
      files.push(full);
    }
  }
  return files;
}

async function main() {
  if (!existsSync(SRC_DIR)) {
    console.error(`No raw-images/ folder found at ${SRC_DIR}`);
    process.exit(1);
  }

  const allFiles = await walk(SRC_DIR);
  const targets = allFiles.filter((f) => CONVERTIBLE.has(path.extname(f).toLowerCase()));

  if (targets.length === 0) {
    console.log("raw-images/ has no convertible images (png/jpg/jpeg/tiff/gif/avif) yet.");
    console.log("Drop some in and re-run: npm run images:webp");
    return;
  }

  let converted = 0;
  let skipped = 0;
  const failures = [];

  for (const file of targets) {
    const rel = path.relative(SRC_DIR, file);
    const outPath = path.join(OUT_DIR, rel).replace(/\.(png|jpe?g|tiff|gif|avif)$/i, ".webp");

    try {
      const [srcStat, outStat] = await Promise.all([
        stat(file),
        existsSync(outPath) ? stat(outPath) : Promise.resolve(null),
      ]);

      if (outStat && outStat.mtimeMs >= srcStat.mtimeMs) {
        skipped++;
        continue;
      }

      await mkdir(path.dirname(outPath), { recursive: true });
      await sharp(file).webp({ quality }).toFile(outPath);
      converted++;
      console.log(`✓ ${rel} -> ${path.relative(ROOT, outPath)}`);
    } catch (err) {
      failures.push({ file: rel, error: err.message });
    }
  }

  console.log(
    `\nDone. ${converted} converted, ${skipped} already up to date${
      failures.length ? `, ${failures.length} failed` : ""
    }.`,
  );

  if (failures.length) {
    console.log("\nFailed:");
    for (const f of failures) console.log(`  ${f.file}: ${f.error}`);
    process.exitCode = 1;
  }
}

main();
