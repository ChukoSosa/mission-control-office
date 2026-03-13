import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";

const MONKEYS_DIR = path.join(process.cwd(), "public", "office", "mcmonkes-library");
const ALLOWED_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".avif"]);

interface LibraryFile {
  url: string;
  fileName: string;
}

async function walkFiles(dirPath: string): Promise<LibraryFile[]> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const results: LibraryFile[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      const nested = await walkFiles(fullPath);
      results.push(...nested);
      continue;
    }

    const extension = path.extname(entry.name).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(extension)) continue;

    const relativePath = path.relative(MONKEYS_DIR, fullPath).split(path.sep).join("/");
    const encodedPath = relativePath
      .split("/")
      .map((segment) => encodeURIComponent(segment))
      .join("/");

    results.push({
      url: `/office/mcmonkes-library/${encodedPath}`,
      fileName: entry.name,
    });
  }

  return results;
}

export async function GET() {
  try {
    const files = await walkFiles(MONKEYS_DIR);
    const lucyFile =
      files.find((file) => /^000\./i.test(file.fileName)) ??
      files.find((file) => /^00\./i.test(file.fileName));
    const avatarPool = files
      .filter((file) => file.url !== lucyFile?.url)
      .map((file) => file.url);

    if (files.length === 0) {
      return NextResponse.json(
        {
          error: "No MC MONKEY images found. Add images to public/office/mcmonkes-library.",
        },
        { status: 404 },
      );
    }

    avatarPool.sort((a, b) => a.localeCompare(b));
    return NextResponse.json({ avatars: avatarPool, lucyAvatar: lucyFile?.url ?? null });
  } catch {
    return NextResponse.json(
      {
        error: "MC MONKEY folder not found. Create public/office/mcmonkes-library and add images.",
      },
      { status: 404 },
    );
  }
}
