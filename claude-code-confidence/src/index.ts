// Types
export type {
  ConfidenceLevel,
  ConfidenceSignal,
  MessageConfidence,
  ToolCall,
  PermissionCheck,
  SessionMetrics,
  AnalyzeSessionOptions,
} from './types.ts';

// Main API functions
export { analyzeSession, analyzeSessionInProject } from './analyzeSession.ts';
export { calculateMetrics, formatMetricsSummary } from './calculateMetrics.ts';

// Confidence heuristics (for customization/testing)
export {
  analyzeTextForConfidence,
  analyzeMessageConfidence,
  calculateConfidenceFromSignals,
  extractTextFromMessage,
  getAllPatternRules,
  getPatternsByLevel,
} from './confidenceHeuristics.ts';
