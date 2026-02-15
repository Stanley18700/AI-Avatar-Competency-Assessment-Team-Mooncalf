import { GoogleGenerativeAI } from '@google/generative-ai';
import { AIEvaluationOutputSchema, validateAIOutput, AIEvaluationOutput } from '../validators/aiOutput';
import { buildEvaluationPrompt } from '../utils/promptBuilder';

interface CriteriaInfo {
  id: string;
  nameTh: string;
  nameEn: string;
  groupNameEn: string;
}

interface CaseInfo {
  title: string;
  descriptionTh: string;
  descriptionEn: string;
  reasoningIndicators: string[];
}

/**
 * Attempt to repair common JSON issues from LLM output:
 * - Trailing commas before ] or }
 * - Truncated responses (try to close open brackets)
 * - Extra text after JSON
 */
function repairJson(str: string): string {
  // Remove trailing commas before } or ]
  let fixed = str.replace(/,\s*([}\]])/g, '$1');
  
  // Try parsing as-is first
  try {
    JSON.parse(fixed);
    return fixed;
  } catch {}

  // If truncated, try to close open brackets/braces
  const opens = (fixed.match(/\[/g) || []).length;
  const closes = (fixed.match(/\]/g) || []).length;
  const openBraces = (fixed.match(/\{/g) || []).length;
  const closeBraces = (fixed.match(/\}/g) || []).length;

  // Trim trailing incomplete entries (e.g. cut-off object in array)
  // Remove last incomplete object if we have unclosed braces
  if (openBraces > closeBraces) {
    // Try removing the last incomplete object entry
    const lastCompleteObj = fixed.lastIndexOf('}');
    if (lastCompleteObj > 0) {
      fixed = fixed.substring(0, lastCompleteObj + 1);
    }
  }

  // Close remaining brackets
  for (let i = 0; i < opens - (fixed.match(/\]/g) || []).length; i++) {
    fixed += ']';
  }
  for (let i = 0; i < (fixed.match(/\{/g) || []).length - (fixed.match(/\}/g) || []).length; i++) {
    fixed += '}';
  }

  // Remove trailing commas again after repair
  fixed = fixed.replace(/,\s*([}\]])/g, '$1');

  return fixed;
}

export async function evaluateWithGemini(
  criteria: CriteriaInfo[],
  caseInfo: CaseInfo,
  transcript: string,
  retryCount: number = 0
): Promise<{ output: AIEvaluationOutput; rawResponse: string; retryCount: number }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  // Use gemini-1.5-flash as primary (best speed/cost balance), fallback to 1.5-pro
  const configuredModels = (process.env.GEMINI_MODELS || 'gemini-1.5-flash,gemini-1.5-pro,gemini-2.0-flash')
    .split(',')
    .map(m => m.trim())
    .filter(Boolean);

  const expectedIds = criteria.map(c => c.id);
  const prompt = buildEvaluationPrompt(criteria, caseInfo, transcript);

  console.log(`[Gemini] Evaluating ${criteria.length} criteria for case: ${caseInfo.title}`);
  console.log(`[Gemini] Expected criteria IDs:`, expectedIds);

  let lastError: string = '';

  for (const modelName of configuredModels) {
    console.log(`[Gemini] Trying model: ${modelName}`);
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        temperature: 0.1,
        topP: 0.95,
        maxOutputTokens: 8192,
      }
    });

    for (let attempt = 0; attempt <= 1; attempt++) {
      try {
        const fullPrompt = attempt === 0
          ? prompt
          : `${prompt}\n\nPREVIOUS ATTEMPT FAILED WITH ERROR: ${lastError}\nPlease fix the output and try again. Return ONLY the JSON, no other text.`;

        const result = await model.generateContent(fullPrompt);
        const responseText = result.response.text();

        console.log(`[Gemini] Model ${modelName}, attempt ${attempt + 1}: Received response (length: ${responseText.length})`);

        let jsonStr = responseText;
        const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
          jsonStr = jsonMatch[1].trim();
          console.log('[Gemini] Extracted JSON from markdown code block');
        } else {
          const braceMatch = responseText.match(/\{[\s\S]*\}/);
          if (braceMatch) {
            jsonStr = braceMatch[0];
            console.log('[Gemini] Extracted raw JSON from response');
          } else {
            console.log('[Gemini] No JSON pattern found in response');
          }
        }

        // Try direct parse first, then attempt repair
        let parsed: any;
        try {
          parsed = JSON.parse(jsonStr);
        } catch (parseErr) {
          console.log('[Gemini] Direct JSON parse failed, attempting repair...');
          const repaired = repairJson(jsonStr);
          parsed = JSON.parse(repaired);
          console.log('[Gemini] JSON repair succeeded');
        }
        const validated = AIEvaluationOutputSchema.parse(parsed);

        console.log(`[Gemini] Successfully parsed and validated. Got ${validated.criteriaScores.length} scores`);

        const rubricCheck = validateAIOutput(validated, expectedIds);
        if (!rubricCheck.valid) {
          lastError = rubricCheck.errors.join('; ');
          console.error(`[Gemini] Validation failed: ${lastError}`);
          if (attempt === 0) continue;
          throw new Error(`AI output validation failed after retry: ${lastError}`);
        }

        console.log(`[Gemini] Validation successful with model ${modelName}`);
        return {
          output: validated,
          rawResponse: responseText,
          retryCount: retryCount + attempt
        };
      } catch (err: any) {
        lastError = err.message || 'Unknown error';
        console.error(`[Gemini] Model ${modelName}, attempt ${attempt + 1} failed:`, lastError);
        if (attempt === 1) {
          break;
        }
      }
    }
  }

  throw new Error(`AI evaluation failed for all configured models: ${lastError}`);
}
