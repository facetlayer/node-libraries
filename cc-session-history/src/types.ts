export interface ChatMessage {
  parentUuid: string | null;
  isSidechain: boolean;
  userType: string;
  cwd: string;
  sessionId: string;
  version: string;
  gitBranch?: string;
  type: 'user' | 'assistant' | 'system' | 'file-history-snapshot';
  message?: {
    role: 'user' | 'assistant';
    content: string | Array<{
      type: 'text' | 'tool_use' | 'tool_result';
      text?: string;
      id?: string;
      name?: string;
      input?: any;
      tool_use_id?: string;
      content?: string | Array<any>;
      is_error?: boolean;
    }>;
    id?: string;
    model?: string;
    stop_reason?: string | null;
    stop_sequence?: string | null;
    usage?: {
      input_tokens?: number;
      cache_creation_input_tokens?: number;
      cache_read_input_tokens?: number;
      output_tokens?: number;
      service_tier?: string;
    };
  };
  content?: string;
  isMeta?: boolean;
  level?: string;
  toolUseID?: string;
  uuid: string;
  timestamp: string;
  requestId?: string;
  toolUseResult?: any;
  /** Derived field: identifies internal message types like hooks and terminal control */
  internalMessageType?: 'terminal_control' | 'hook';
  /** Derived field: identifies permission check results */
  permissionResult?: 'rejected';
}

export interface ChatSession {
  sessionId: string;
  messages: ChatMessage[];
  firstMessageTimestamp?: string;
  lastMessageTimestamp: string;
  projectPath: string;
  messageCount: number;
}

export interface ProjectDirectory {
  path: string;
  sessions: ChatSession[];
}
