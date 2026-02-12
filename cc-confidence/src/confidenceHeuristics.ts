import type { ConfidenceLevel, ConfidenceSignal, MessageConfidence } from './types.ts';

interface PatternRule {
  pattern: RegExp;
  level: ConfidenceLevel;
  weight: number;
  description: string;
}

// High confidence indicators - Claude is confident and proceeding smoothly
const HIGH_CONFIDENCE_PATTERNS: PatternRule[] = [
  { pattern: /\bperfect\b/i, level: 'high', weight: 3, description: 'perfect' },
  { pattern: /\bexcellent\b/i, level: 'high', weight: 3, description: 'excellent' },
  { pattern: /\bexactly what/i, level: 'high', weight: 2, description: 'exactly what' },
  { pattern: /\bthat's correct\b/i, level: 'high', weight: 2, description: 'thats correct' },
  { pattern: /\bworking as expected\b/i, level: 'high', weight: 3, description: 'working as expected' },
  { pattern: /\bsuccessfully\b/i, level: 'high', weight: 2, description: 'successfully' },
  { pattern: /\bcompleted\b/i, level: 'high', weight: 1, description: 'completed' },
  { pattern: /\bgreat\b/i, level: 'high', weight: 1, description: 'great' },
  { pattern: /\ball tests pass/i, level: 'high', weight: 3, description: 'all tests pass' },
  { pattern: /\btests are passing\b/i, level: 'high', weight: 3, description: 'tests are passing' },
  { pattern: /\bthis looks good\b/i, level: 'high', weight: 2, description: 'this looks good' },
  { pattern: /\bthe fix works\b/i, level: 'high', weight: 3, description: 'the fix works' },
  { pattern: /\bimplementation is complete\b/i, level: 'high', weight: 3, description: 'implementation complete' },
  { pattern: /\bno errors\b/i, level: 'high', weight: 2, description: 'no errors' },
  { pattern: /\bno issues\b/i, level: 'high', weight: 2, description: 'no issues' },
  { pattern: /\bclean build\b/i, level: 'high', weight: 2, description: 'clean build' },
];

// Medium confidence indicators - Claude is proceeding but with some uncertainty
const MEDIUM_CONFIDENCE_PATTERNS: PatternRule[] = [
  { pattern: /\bshould work\b/i, level: 'medium', weight: 1, description: 'should work' },
  { pattern: /\bi think\b/i, level: 'medium', weight: 1, description: 'i think' },
  { pattern: /\bi believe\b/i, level: 'medium', weight: 1, description: 'i believe' },
  { pattern: /\bprobably\b/i, level: 'medium', weight: 1, description: 'probably' },
  { pattern: /\blikely\b/i, level: 'medium', weight: 1, description: 'likely' },
  { pattern: /\blet me try\b/i, level: 'medium', weight: 1, description: 'let me try' },
  { pattern: /\blet's see\b/i, level: 'medium', weight: 1, description: 'lets see' },
  { pattern: /\battempting\b/i, level: 'medium', weight: 1, description: 'attempting' },
  { pattern: /\bmight need\b/i, level: 'medium', weight: 1, description: 'might need' },
  { pattern: /\bcould be\b/i, level: 'medium', weight: 1, description: 'could be' },
  { pattern: /\bseems to\b/i, level: 'medium', weight: 1, description: 'seems to' },
  { pattern: /\bappears to\b/i, level: 'medium', weight: 1, description: 'appears to' },
];

// Low confidence indicators - Claude is uncertain, backtracking, or encountering issues
const LOW_CONFIDENCE_PATTERNS: PatternRule[] = [
  { pattern: /\bwait\b/i, level: 'low', weight: 2, description: 'wait' },
  { pattern: /\bactually\b/i, level: 'low', weight: 1, description: 'actually (correction)' },
  { pattern: /\bi was wrong\b/i, level: 'low', weight: 3, description: 'i was wrong' },
  { pattern: /\bmy mistake\b/i, level: 'low', weight: 3, description: 'my mistake' },
  { pattern: /\bsorry\b/i, level: 'low', weight: 2, description: 'sorry' },
  { pattern: /\boops\b/i, level: 'low', weight: 2, description: 'oops' },
  { pattern: /\blet me reconsider\b/i, level: 'low', weight: 2, description: 'let me reconsider' },
  { pattern: /\blet me rethink\b/i, level: 'low', weight: 2, description: 'let me rethink' },
  { pattern: /\bi need to fix\b/i, level: 'low', weight: 2, description: 'i need to fix' },
  { pattern: /\bthat didn't work\b/i, level: 'low', weight: 3, description: 'that didnt work' },
  { pattern: /\bfailed\b/i, level: 'low', weight: 2, description: 'failed' },
  { pattern: /\berror\b/i, level: 'low', weight: 1, description: 'error' },
  { pattern: /\bunexpected\b/i, level: 'low', weight: 2, description: 'unexpected' },
  { pattern: /\bi'm not sure\b/i, level: 'low', weight: 2, description: 'im not sure' },
  { pattern: /\bi'm unsure\b/i, level: 'low', weight: 2, description: 'im unsure' },
  { pattern: /\bi don't know\b/i, level: 'low', weight: 2, description: 'i dont know' },
  { pattern: /\bconfused\b/i, level: 'low', weight: 2, description: 'confused' },
  { pattern: /\bstrange\b/i, level: 'low', weight: 1, description: 'strange' },
  { pattern: /\bweird\b/i, level: 'low', weight: 1, description: 'weird' },
  { pattern: /\bhmm\b/i, level: 'low', weight: 1, description: 'hmm (hesitation)' },
  { pattern: /\binteresting\b/i, level: 'low', weight: 1, description: 'interesting (often indicates surprise)' },
  { pattern: /\blet me try again\b/i, level: 'low', weight: 2, description: 'let me try again' },
  { pattern: /\blet me fix\b/i, level: 'low', weight: 2, description: 'let me fix' },
  { pattern: /\btroubleshooting\b/i, level: 'low', weight: 1, description: 'troubleshooting' },
  { pattern: /\bdebugging\b/i, level: 'low', weight: 1, description: 'debugging' },
];

const ALL_PATTERNS: PatternRule[] = [
  ...HIGH_CONFIDENCE_PATTERNS,
  ...MEDIUM_CONFIDENCE_PATTERNS,
  ...LOW_CONFIDENCE_PATTERNS,
];

/**
 * Extract text content from a message, handling various content formats
 */
export function extractTextFromMessage(message: any): string {
  if (!message) return '';

  // Handle direct content string
  if (typeof message.content === 'string') {
    return message.content;
  }

  // Handle message.message.content
  if (message.message?.content) {
    if (typeof message.message.content === 'string') {
      return message.message.content;
    }

    // Handle array of content blocks
    if (Array.isArray(message.message.content)) {
      return message.message.content
        .filter((block: any) => block.type === 'text')
        .map((block: any) => block.text || '')
        .join('\n');
    }
  }

  return '';
}

/**
 * Analyze text for confidence signals
 */
export function analyzeTextForConfidence(text: string): ConfidenceSignal[] {
  const signals: ConfidenceSignal[] = [];

  for (const rule of ALL_PATTERNS) {
    const match = rule.pattern.exec(text);
    if (match) {
      signals.push({
        pattern: rule.description,
        level: rule.level,
        weight: rule.weight,
        matchedText: match[0],
      });
    }
  }

  return signals;
}

/**
 * Calculate overall confidence from signals
 */
export function calculateConfidenceFromSignals(signals: ConfidenceSignal[]): MessageConfidence {
  if (signals.length === 0) {
    return {
      level: 'unknown',
      score: 0,
      signals: [],
    };
  }

  // Calculate weighted score
  // High confidence signals add positive weight
  // Low confidence signals add negative weight
  // Medium confidence signals add small positive weight
  let totalWeight = 0;
  let weightedScore = 0;

  for (const signal of signals) {
    totalWeight += signal.weight;

    if (signal.level === 'high') {
      weightedScore += signal.weight * 1;
    } else if (signal.level === 'medium') {
      weightedScore += signal.weight * 0.3;
    } else if (signal.level === 'low') {
      weightedScore -= signal.weight * 1;
    }
  }

  // Normalize score to -1 to 1 range
  const normalizedScore = totalWeight > 0 ? weightedScore / totalWeight : 0;

  // Determine overall level based on score
  let level: ConfidenceLevel;
  if (normalizedScore >= 0.5) {
    level = 'high';
  } else if (normalizedScore >= 0) {
    level = 'medium';
  } else {
    level = 'low';
  }

  return {
    level,
    score: normalizedScore,
    signals,
  };
}

/**
 * Analyze a single message for confidence
 */
export function analyzeMessageConfidence(message: any): MessageConfidence {
  const text = extractTextFromMessage(message);
  const signals = analyzeTextForConfidence(text);
  return calculateConfidenceFromSignals(signals);
}

/**
 * Get all pattern rules (useful for testing and debugging)
 */
export function getAllPatternRules(): PatternRule[] {
  return ALL_PATTERNS;
}

/**
 * Get patterns by confidence level
 */
export function getPatternsByLevel(level: ConfidenceLevel): PatternRule[] {
  return ALL_PATTERNS.filter(p => p.level === level);
}
