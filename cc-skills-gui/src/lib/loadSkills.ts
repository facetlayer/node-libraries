import { readdirSync, readFileSync, existsSync, realpathSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { parseFrontmatter, serializeFrontmatter } from './frontmatter.ts';

export interface SkillInfo {
  name: string;
  location: 'personal' | 'project';
  dirName: string;
  path: string;
  content: string;
  frontmatter: Record<string, any>;
}

function getPersonalSkillsDir(): string {
  return join(homedir(), '.claude', 'skills');
}

function getProjectSkillsDir(): string {
  return join(process.cwd(), '.claude', 'skills');
}

function loadSkillsFromDir(dir: string, location: 'personal' | 'project'): SkillInfo[] {
  if (!existsSync(dir)) {
    return [];
  }

  let resolvedDir: string;
  try {
    resolvedDir = realpathSync(dir);
  } catch {
    return [];
  }

  const skills: SkillInfo[] = [];

  let entries: string[];
  try {
    entries = readdirSync(resolvedDir);
  } catch {
    return [];
  }

  for (const entry of entries) {
    const skillFile = join(resolvedDir, entry, 'SKILL.md');
    if (!existsSync(skillFile)) continue;

    try {
      const raw = readFileSync(skillFile, 'utf-8');
      const parsed = parseFrontmatter(raw);

      skills.push({
        name: parsed.frontmatter.name || entry,
        location,
        dirName: entry,
        path: skillFile,
        content: parsed.content,
        frontmatter: parsed.frontmatter,
      });
    } catch {
      // Skip files that can't be read
    }
  }

  return skills;
}

export function loadAllSkills(): SkillInfo[] {
  const personal = loadSkillsFromDir(getPersonalSkillsDir(), 'personal');
  const project = loadSkillsFromDir(getProjectSkillsDir(), 'project');
  return [...personal, ...project];
}

export function saveSkill(
  location: 'personal' | 'project',
  dirName: string,
  frontmatter: Record<string, any>,
  content: string
): void {
  const baseDir = location === 'personal' ? getPersonalSkillsDir() : getProjectSkillsDir();
  const skillDir = join(baseDir, dirName);
  const skillFile = join(skillDir, 'SKILL.md');

  // Create directory if it doesn't exist
  mkdirSync(skillDir, { recursive: true });

  const fileContent = serializeFrontmatter(frontmatter, content);
  writeFileSync(skillFile, fileContent, 'utf-8');
}
