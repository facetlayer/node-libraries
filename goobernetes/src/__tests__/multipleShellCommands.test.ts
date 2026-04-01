import { describe, it, expect } from 'vitest';
import { parseFile } from '@facetlayer/qc';

describe('multiple shell() commands', () => {
    it('collects all shell() commands from an after-deploy block', () => {
        const config = `
after-deploy
  shell(echo first)
  shell(echo second)
  shell(echo third)
`;
        const queries = parseFile(config);
        const afterDeploy = queries.find(q => q.command === 'after-deploy');
        expect(afterDeploy).toBeDefined();

        // Using getAttr only returns the last one (the bug)
        const singleResult = afterDeploy.getAttr('shell').toOriginalString();
        expect(singleResult).toBe('echo third');

        // Iterating tags gets all of them (the fix)
        const allShells = afterDeploy.tags
            .filter(tag => tag.attr === 'shell')
            .map(tag => tag.toOriginalString());

        expect(allShells).toEqual(['echo first', 'echo second', 'echo third']);
    });

    it('collects all shell() commands from a before-deploy block', () => {
        const config = `
before-deploy
  shell(pnpm build)
  shell(pnpm lint)
`;
        const queries = parseFile(config);
        const beforeDeploy = queries.find(q => q.command === 'before-deploy');
        expect(beforeDeploy).toBeDefined();

        const allShells = beforeDeploy.tags
            .filter(tag => tag.attr === 'shell')
            .map(tag => tag.toOriginalString());

        expect(allShells).toEqual(['pnpm build', 'pnpm lint']);
    });

    it('works with a single shell() command', () => {
        const config = `
after-deploy
  shell(echo only-one)
`;
        const queries = parseFile(config);
        const afterDeploy = queries.find(q => q.command === 'after-deploy');

        const allShells = afterDeploy.tags
            .filter(tag => tag.attr === 'shell')
            .map(tag => tag.toOriginalString());

        expect(allShells).toEqual(['echo only-one']);
    });
});
