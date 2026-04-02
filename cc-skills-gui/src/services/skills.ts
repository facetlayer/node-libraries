import { createEndpoint, ServiceDefinition } from '@facetlayer/prism-framework';
import { loadAllSkills, saveSkill, createSkill } from '../lib/loadSkills.ts';

const listSkills = createEndpoint({
  method: 'GET',
  path: '/skills',
  description: 'List all skills (personal + project)',
  handler: async () => {
    return loadAllSkills();
  },
});

const updateSkill = createEndpoint({
  method: 'PUT',
  path: '/skills/:location/:dirName',
  description: 'Save updated skill',
  handler: async (input: { location: string; dirName: string; frontmatter: Record<string, any>; content: string }) => {
    const { location, dirName, frontmatter, content } = input;

    if (location !== 'personal' && location !== 'project') {
      throw new Error('Location must be "personal" or "project"');
    }

    saveSkill(location, dirName, frontmatter, content);
    return { ok: true };
  },
});

const newSkill = createEndpoint({
  method: 'POST',
  path: '/skills',
  description: 'Create a new skill',
  handler: async (input: { name: string; location: string }) => {
    const { name, location } = input;

    if (location !== 'personal' && location !== 'project') {
      throw new Error('Location must be "personal" or "project"');
    }

    if (!name || !name.trim()) {
      throw new Error('Name is required');
    }

    const skill = createSkill(location as 'personal' | 'project', name.trim());
    return skill;
  },
});

export const skillsService: ServiceDefinition = {
  name: 'skills',
  endpoints: [listSkills, updateSkill, newSkill],
};
