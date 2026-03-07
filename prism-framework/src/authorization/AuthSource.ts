
/*
 * An 'auth source' is a verified authentication token or session that has been
 * extracted from a request. This represents the source of identity for authorization
 * decisions. Examples: a validated session cookie, a verified API key, etc.
 */
export interface AuthSource {
  type: string;
}

export interface CookieAuthSource extends AuthSource {
  type: 'cookie';
  sessionId: string;
}
