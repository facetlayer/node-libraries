// @ts-check
// Minimal working configuration for debugging

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'sqlite-wrapper',
  tagline: 'Helper wrapper around SQLite with schema management and migrations',
  favicon: 'img/favicon.ico',

  url: 'https://facetlayer.github.io',
  baseUrl: '/sqlite-wrapper/',

  organizationName: 'facetlayer',
  projectName: 'sqlite-wrapper',

  onBrokenLinks: 'throw',

  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          routeBasePath: '/',
          editUrl: 'https://github.com/facetlayer/sqlite-wrapper/tree/main/docs-site/',
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      navbar: {
        title: 'sqlite-wrapper',
        items: [
          {
            type: 'docSidebar',
            sidebarId: 'tutorialSidebar',
            position: 'left',
            label: 'Docs',
          },
          {
            href: 'https://github.com/facetlayer/sqlite-wrapper',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        copyright: `Copyright © ${new Date().getFullYear()} Andy Fischer.`,
      },
    }),
};

module.exports = config;
