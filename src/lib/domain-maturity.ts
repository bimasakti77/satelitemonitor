/** Level terbuka jika level sebelumnya sudah punya dokumen (level 1 selalu terbuka). */
export function isDomainLevelUnlocked(
  level: number,
  levelsWithEvidence: Iterable<number>
) {
  if (level < 1 || level > 5) return false;
  if (level === 1) return true;
  const set = new Set(levelsWithEvidence);
  return set.has(level - 1);
}

/** Maturity = rantai berturut dari level 1 yang sudah punya dokumen. */
export function computeMaturityFromEvidenceLevels(
  levelsWithEvidence: Iterable<number>
) {
  const set = new Set(levelsWithEvidence);
  let maturity = 0;
  for (let level = 1; level <= 5; level++) {
    if (!set.has(level)) break;
    maturity = level;
  }
  return maturity;
}
