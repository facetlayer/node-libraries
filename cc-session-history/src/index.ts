// Types
export type {
  ChatMessage,
  ChatSession,
  ProjectDirectory
} from './types.ts';

// Main API functions
export { listChatSessions } from './listChatSessions.ts';
export type { ListChatSessionsOptions } from './listChatSessions.ts';

export { getChatSessionDetails as getSessionDetails } from './getChatSessionDetails.ts';
export type { GetChatSessionDetailsOptions as GetSessionDetailsOptions } from './getChatSessionDetails.ts';

// Utility functions
export { annotateMessages, annotateInternalMessages, toolNeedsPermission } from './annotateMessages.ts';

export { listPermissionChecks } from './listPermissionChecks.ts';
export type { PermissionCheck, ListPermissionChecksOptions } from './listPermissionChecks.ts';

export { listSkills } from './listSkills.ts';
export type { ListSkillsOptions, SkillUsageRow } from './listSkills.ts';

export { listRoutines } from './listRoutines.ts';
export type { ListRoutinesOptions, RoutineUsageRow } from './listRoutines.ts';

export { getSkillRuns } from './getSkillRuns.ts';
export type { GetSkillRunsOptions, SkillRunRow, GetSkillRunsResult } from './getSkillRuns.ts';

export {
  computeSessionMetrics,
  sessionMetricsFor,
  isUserTypedPrompt,
  extractUserText,
  oneLine,
} from './sessionMetrics.ts';
export type { SessionMetrics } from './sessionMetrics.ts';

export { listAllSessions } from './listAllSessions.ts';
export type { ListAllSessionsOptions } from './listAllSessions.ts';

export {
  extractSessionMetadata,
  skillNameFromSkillFile,
} from './sessionMetadata.ts';
export type {
  SessionMetadata,
  SkillInvocation,
  SkillInvocationSource,
  ScheduledTaskInfo,
} from './sessionMetadata.ts';

export {
  filterSessions,
  parseTimeBound,
  normalizeListArg,
} from './sessionFilters.ts';
export type { SessionFilterOptions } from './sessionFilters.ts';

// UI helpers
export { TextGrid } from './TextGrid.ts';
export type { TextGridColumn } from './TextGrid.ts';
