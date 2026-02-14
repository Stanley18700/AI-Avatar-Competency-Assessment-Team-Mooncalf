import { z } from 'zod';

// Schema for validating AI evaluation output
export const AICriteriaScoreSchema = z.object({
  criteriaId: z.string(),
  score: z.number().int().min(1).max(5),
  reasoning: z.string().optional()
});

export const AIEvaluationOutputSchema = z.object({
  criteriaScores: z.array(AICriteriaScoreSchema),
  strengths: z.string(),
  weaknesses: z.string(),
  recommendations: z.string(),
  confidenceScore: z.number().min(0).max(1)
});

export type AIEvaluationOutput = z.infer<typeof AIEvaluationOutputSchema>;

// Validate AI output against rubric rules
export function validateAIOutput(
  output: AIEvaluationOutput,
  expectedCriteriaIds: string[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check all criteria present
  const returnedIds = output.criteriaScores.map(s => s.criteriaId);
  const missingIds = expectedCriteriaIds.filter(id => !returnedIds.includes(id));
  if (missingIds.length > 0) {
    errors.push(`Missing criteria: ${missingIds.join(', ')}`);
  }

  // Check no invented criteria
  const extraIds = returnedIds.filter(id => !expectedCriteriaIds.includes(id));
  if (extraIds.length > 0) {
    errors.push(`Unknown criteria: ${extraIds.join(', ')}`);
  }

  // Check score range
  for (const cs of output.criteriaScores) {
    if (cs.score < 1 || cs.score > 5) {
      errors.push(`Score out of range for ${cs.criteriaId}: ${cs.score}`);
    }
  }

  return { valid: errors.length === 0, errors };
}
