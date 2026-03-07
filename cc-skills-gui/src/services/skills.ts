import { createEndpoint, ServiceDefinition } from '@facetlayer/prism-framework';
import { loadAllSkills, saveSkill } from '../lib/loadSkills.ts';

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

export const skillsService: ServiceDefinition = {
  name: 'skills',
  endpoints: [listSkills, updateSkill],
};
