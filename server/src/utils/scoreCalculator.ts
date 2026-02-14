export function calculateGap(score: number, standardLevel: number): number {
  return score - standardLevel;
}

export function calculateCategoryAverage(
  criteriaScores: { criteriaId: string; score: number }[],
  criteriaToGroupMap: Record<string, string>
): { groupId: string; averageScore: number }[] {
  const groupScores: Record<string, number[]> = {};

  for (const cs of criteriaScores) {
    const groupId = criteriaToGroupMap[cs.criteriaId];
    if (groupId) {
      if (!groupScores[groupId]) groupScores[groupId] = [];
      groupScores[groupId].push(cs.score);
    }
  }

  return Object.entries(groupScores).map(([groupId, scores]) => ({
    groupId,
    averageScore: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100
  }));
}

export function calculateWeightedTotal(
  criteriaScores: { score: number }[]
): number {
  if (criteriaScores.length === 0) return 0;
  const total = criteriaScores.reduce((sum, cs) => sum + cs.score, 0);
  return Math.round((total / criteriaScores.length) * 100) / 100;
}

export function getExperienceLevelLabel(level: string): { en: string; th: string } {
  const labels: Record<string, { en: string; th: string }> = {
    LEVEL_1: { en: '0-1 year (Novice)', th: '0-1 ปี (มือใหม่)' },
    LEVEL_2: { en: '1-2 years (Beginner)', th: '1-2 ปี (เริ่มต้น)' },
    LEVEL_3: { en: '2-3 years (Competent)', th: '2-3 ปี (มีความสามารถ)' },
    LEVEL_4: { en: '>3 years (Charge Nurse)', th: 'มากกว่า 3 ปี (หัวหน้า)' },
    LEVEL_5: { en: '>5 years (Expert)', th: 'มากกว่า 5 ปี (เชี่ยวชาญ)' }
  };
  return labels[level] || { en: level, th: level };
}
