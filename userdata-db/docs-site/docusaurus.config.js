// @ts-check

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: '@facetlayer/userdata-db',
  tagline: 'SQLite database in user home directory following XDG standards',
  favicon: 'img/favicon.ico',

  url: 'https://facetlayer.github.io',
  baseUrl: '/userdata-db/',

  organizationName: 'facetlayer',
  projectName: 'userdata-db',

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
          editUrl: 'https://github.com/facetlayer/userdata-db/tree/main/docs-site/',
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
        title: 'userdata-db',
        items: [
          {
            type: 'docSidebar',
            sidebarId: 'tutorialSidebar',
            position: 'left',
            label: 'Docs',
          },
          {
            href: 'https://github.com/facetlayer/userdata-db',
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
