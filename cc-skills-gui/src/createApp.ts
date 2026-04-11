import { App, type PrismApp } from '@facetlayer/prism-framework/core';
import { skillsService } from './services/skills.ts';

/**
 * Build the PrismApp used by both the web entry point (`api.ts`) and the
 * Electron desktop entry point (`desktop.ts`).
 */
export function createApp(): PrismApp {
    return new App({
        name: 'cc-skills-gui',
        description: 'Web GUI for editing Claude Code skills',
        services: [skillsService],
    });
}
