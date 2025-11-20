import { z } from 'zod';

// Content block types for messages
const TextContentBlockSchema = z.object({
  type: z.literal('text'),
  text: z.string(),
});

const ToolUseContentBlockSchema = z.object({
  type: z.literal('tool_use'),
  id: z.string(),
  name: z.string(),
  input: z.any(),
});

const ToolResultContentBlockSchema = z.object({
  type: z.literal('tool_result'),
  tool_use_id: z.string(),
  content: z.union([z.string(), z.array(z.any())]).optional(),
  is_error: z.boolean().optional(),
});

const ThinkingContentBlockSchema = z.object({
  type: z.literal('thinking'),
  thinking: z.string(),
  signature: z.string().optional(),
});

const ImageContentBlockSchema = z.object({
  type: z.literal('image'),
  source: z.object({
    type: z.string(),
    media_type: z.string().optional(),
    data: z.string().optional(),
    url: z.string().optional(),
  }),
});

const ContentBlockSchema = z.union([
  TextContentBlockSchema,
  ToolUseContentBlockSchema,
  ToolResultContentBlockSchema,
  ThinkingContentBlockSchema,
  ImageContentBlockSchema,
]);

// Usage tracking schema
const UsageSchema = z.object({
  input_tokens: z.number().optional(),
  cache_creation_input_tokens: z.number().optional(),
  cache_read_input_tokens: z.number().optional(),
  output_tokens: z.number().optional(),
  service_tier: z.string().nullable().optional(),
  cache_creation: z.object({
    ephemeral_5m_input_tokens: z.number().optional(),
    ephemeral_1h_input_tokens: z.number().optional(),
  }).optional(),
  server_tool_use: z.object({
    web_search_requests: z.number().optional(),
    web_fetch_requests: z.number().optional(),
  }).optional(),
});

// API Message schema (used in assistant and user messages)
const ApiMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.union([z.string(), z.array(ContentBlockSchema)]),
  id: z.string().optional(),
  model: z.string().optional(),
  type: z.literal('message').optional(),
  stop_reason: z.string().nullable().optional(),
  stop_sequence: z.string().nullable().optional(),
  usage: UsageSchema.optional(),
  container: z.any().optional(),
  context_management: z.any().optional(),
});

// User message
const UserMessageSchema = z.object({
  parentUuid: z.string().nullable(),
  isSidechain: z.boolean(),
  userType: z.string(),
  cwd: z.string(),
  sessionId: z.string(),
  version: z.string(),
  gitBranch: z.string().optional(),
  type: z.literal('user'),
  message: ApiMessageSchema,
  uuid: z.string(),
  timestamp: z.string(),
  isMeta: z.boolean().optional(),
});

// Assistant message
const AssistantMessageSchema = z.object({
  parentUuid: z.string().nullable(),
  isSidechain: z.boolean(),
  userType: z.string(),
  cwd: z.string(),
  sessionId: z.string(),
  version: z.string(),
  gitBranch: z.string().optional(),
  type: z.literal('assistant'),
  message: ApiMessageSchema,
  requestId: z.string().optional(),
  uuid: z.string(),
  timestamp: z.string(),
  isApiErrorMessage: z.boolean().optional(),
});

// System message
const SystemMessageSchema = z.object({
  parentUuid: z.string().nullable(),
  isSidechain: z.boolean(),
  userType: z.string(),
  cwd: z.string(),
  sessionId: z.string(),
  version: z.string(),
  gitBranch: z.string().optional(),
  type: z.literal('system'),
  subtype: z.string().optional(),
  content: z.string().optional(),
  level: z.string().optional(),
  timestamp: z.string(),
  uuid: z.string(),
  isMeta: z.boolean().optional(),
  error: z.any().optional(),
  retryInMs: z.number().optional(),
  retryAttempt: z.number().optional(),
  maxRetries: z.number().optional(),
});

// File history snapshot - completely different structure
const FileHistorySnapshotSchema = z.object({
  type: z.literal('file-history-snapshot'),
  messageId: z.string(),
  snapshot: z.object({
    messageId: z.string(),
    trackedFileBackups: z.record(z.string(), z.any()),
    timestamp: z.string(),
  }),
  isSnapshotUpdate: z.boolean(),
});

// Summary message - session summary
const SummaryMessageSchema = z.object({
  type: z.literal('summary'),
  summary: z.string(),
  leafUuid: z.string(),
});

// Queue operation message - task queue operations
const QueueOperationMessageSchema = z.object({
  type: z.literal('queue-operation'),
  operation: z.enum(['enqueue', 'remove', 'popAll', 'dequeue']),
  timestamp: z.string(),
  content: z.string().optional(),
  sessionId: z.string(),
});

// Union of all message types
export const ChatSessionMessageSchema = z.union([
  UserMessageSchema,
  AssistantMessageSchema,
  SystemMessageSchema,
  FileHistorySnapshotSchema,
  SummaryMessageSchema,
  QueueOperationMessageSchema,
]);

// Export individual schemas for use in other parts of the codebase
export const Schemas = {
  TextContentBlock: TextContentBlockSchema,
  ToolUseContentBlock: ToolUseContentBlockSchema,
  ToolResultContentBlock: ToolResultContentBlockSchema,
  ThinkingContentBlock: ThinkingContentBlockSchema,
  ImageContentBlock: ImageContentBlockSchema,
  ContentBlock: ContentBlockSchema,
  Usage: UsageSchema,
  ApiMessage: ApiMessageSchema,
  UserMessage: UserMessageSchema,
  AssistantMessage: AssistantMessageSchema,
  SystemMessage: SystemMessageSchema,
  FileHistorySnapshot: FileHistorySnapshotSchema,
  SummaryMessage: SummaryMessageSchema,
  QueueOperationMessage: QueueOperationMessageSchema,
  ChatSessionMessage: ChatSessionMessageSchema,
};

// TypeScript types derived from schemas
export type ChatSessionMessage = z.infer<typeof ChatSessionMessageSchema>;
export type UserMessage = z.infer<typeof UserMessageSchema>;
export type AssistantMessage = z.infer<typeof AssistantMessageSchema>;
export type SystemMessage = z.infer<typeof SystemMessageSchema>;
export type FileHistorySnapshot = z.infer<typeof FileHistorySnapshotSchema>;
export type SummaryMessage = z.infer<typeof SummaryMessageSchema>;
export type QueueOperationMessage = z.infer<typeof QueueOperationMessageSchema>;
export type ApiMessage = z.infer<typeof ApiMessageSchema>;
export type ContentBlock = z.infer<typeof ContentBlockSchema>;
export type Usage = z.infer<typeof UsageSchema>;
