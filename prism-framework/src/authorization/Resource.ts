/*
 * A 'resource' is a piece of data that the user can have access to.
 * This can be a user, a project, a session, or something else.
 */
export interface Resource {
  type: 'user' | 'project' | 'session' | 'custom';
  id: string;
}
