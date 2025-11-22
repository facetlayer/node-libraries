/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */

// @ts-check

/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  tutorialSidebar: [
    {
      type: 'doc',
      id: 'index',
      label: 'Introduction',
    },
    {
      type: 'doc',
      id: 'getting-started',
      label: 'Getting Started',
    },
    {
      type: 'doc',
      id: 'database-loader',
      label: 'DatabaseLoader',
    },
    {
      type: 'doc',
      id: 'sqlite-database',
      label: 'SqliteDatabase',
    },
    {
      type: 'doc',
      id: 'migration-behavior',
      label: 'Migration Behavior',
    },
    {
      type: 'doc',
      id: 'schema',
      label: 'Database Schema',
    },
    {
      type: 'doc',
      id: 'singleton-accessor',
      label: 'SingletonAccessor',
    },
    {
      type: 'doc',
      id: 'singleton-incrementing-id',
      label: 'SingletonIncrementingId',
    },
  ],
};

module.exports = sidebars;
