import { App, type PrismApp } from '@facetlayer/prism-framework/core';
import { notesService } from './notesService.js';

/**
 * Build the PrismApp used by both the Electron and web entry points.
 * Keeping this in one place guarantees the two modes run exactly the same
 * services against the same handlers.
 */
export function createApp(): PrismApp {
    return new App({
        name: 'Prism Notes Sample',
        description: 'A sample desktop app built with Prism Framework + Electron',
        services: [notesService],
    });
}
