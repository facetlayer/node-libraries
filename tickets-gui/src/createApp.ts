import { App, type PrismApp } from '@facetlayer/prism-framework/core';
import { ticketsService } from './services/tickets-service.ts';

/**
 * Build the PrismApp used by both the web entry point (`api.ts`) and the
 * Electron desktop entry point (`desktop.ts`).
 */
export function createApp(): PrismApp {
    return new App({
        name: 'Tickets Manager',
        description: 'Desktop interface for managing feedback tickets',
        services: [ticketsService],
    });
}
