export interface SkillInfo {
  name: string;
  location: 'personal' | 'project';
  dirName: string;
  path: string;
  content: string;
  frontmatter: Record<string, any>;
}

export function skillKey(s: SkillInfo): string {
  return s.location + '/' + s.dirName;
}
