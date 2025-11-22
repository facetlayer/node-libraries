/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation
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
      id: 'api',
      label: 'API Reference',
    },
    {
      type: 'doc',
      id: 'directory-resolution',
      label: 'Directory Resolution',
    },
    {
      type: 'doc',
      id: 'migration',
      label: 'Schema Migration',
    },
  ],
};

module.exports = sidebars;
