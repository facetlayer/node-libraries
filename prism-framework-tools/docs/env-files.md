---
name: env-files
description: Recommended strategy for environment variable configuration in Prism Framework projects
---

# Environment Files Strategy

The typical env variables needed for a Prism app are:

### Backend

Next to the API / backend code there should be a .env file with:


| name | example value | description |
| ---- | ------------- | ----------- |
| PRISM_API_PORT | `<port number>` | The port for the web server |
| DATABASE_DIR | data | The relative path to a folder that has SQlite databases |
| WEB_BASE_URL | `http://localhost:<number>` | The URL for the web server |
| ENABLE_TEST_ENDPOINTS | `true` | Whether to enable dev-only debugging & testing endpoints |

### Frontend

In the frontend directory, these variables are recommended:

| name | example value | description |
| ---- | ------------- | ----------- |
| PORT | `<port number>` | The port for the web server. Should match WEB_BASE_URL from the backend. |
| NEXT_PUBLIC_API_URL | `http://localhost:<number>` | The URL for the API server. Should match PRISM_API_PORT from the backend. |


Remember that if a variable is used in the frontend code, it needs a prefix of NEXT_PUBLIC_

#### Next.js Launching

Next.js doesn't load the .env file by default so it's recommended to have this script in package.json:

  "scripts": {
    "dev": "dotenv -e .env next dev",
    ...
  },

# Port assignment

It's recommended to use the `@facetlayer/port-assignment` tool if you need to assign new unique port numbers.

Example:

    port-assigment claim --name <project name>

Run `port-assigment list-docs` for more documentation.
