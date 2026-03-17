import "server-only";

import { prisma } from "./prisma";

const SYSTEM_OPERATOR_ID = "operator-root";
export const DEFAULT_OUTPUT_FOLDER = "mcmonkeys";

export async function getOutputFolderPath(): Promise<string> {
  const operator = await prisma.operator.findUnique({
    where: { id: SYSTEM_OPERATOR_ID },
    select: { preferences: true },
  });

  if (!operator?.preferences) return DEFAULT_OUTPUT_FOLDER;

  const prefs = operator.preferences as Record<string, unknown>;
  const stored = prefs.outputFolderPath;
  return typeof stored === "string" && stored.length > 0 ? stored : DEFAULT_OUTPUT_FOLDER;
}

export async function setOutputFolderPath(folderPath: string): Promise<void> {
  const existing = await prisma.operator.findUnique({
    where: { id: SYSTEM_OPERATOR_ID },
    select: { preferences: true },
  });
  const currentPrefs = (existing?.preferences as Record<string, unknown>) ?? {};

  await prisma.operator.upsert({
    where: { id: SYSTEM_OPERATOR_ID },
    create: {
      id: SYSTEM_OPERATOR_ID,
      name: "Operator",
      email: "operator@mclucy.local",
      preferences: { ...currentPrefs, outputFolderPath: folderPath },
    },
    update: {
      preferences: { ...currentPrefs, outputFolderPath: folderPath },
    },
  });
}
