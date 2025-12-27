interface OpenAPISchema {
  paths: Record<string, Record<string, Operation>>;
  components?: {
    schemas?: Record<string, any>;
  };
}

interface Operation {
  operationId?: string;
  requestBody?: {
    content?: {
      'application/json'?: {
        schema?: any;
      };
    };
  };
  responses?: {
    '200'?: {
      content?: {
        'application/json'?: {
          schema?: any;
        };
      };
    };
  };
}

interface EndpointMapping {
  method: string;
  path: string;
  operationId: string;
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function schemaToTypeScript(schema: any, components?: Record<string, any>, indent = 0): string {
  if (!schema) {
    return 'unknown';
  }

  const indentStr = '  '.repeat(indent);

  // Handle $ref
  if (schema.$ref) {
    const refName = schema.$ref.split('/').pop();
    return refName;
  }

  // Handle array
  if (schema.type === 'array') {
    const itemType = schemaToTypeScript(schema.items, components, indent);
    return `Array<${itemType}>`;
  }

  // Handle object
  if (schema.type === 'object' || schema.properties) {
    const properties = schema.properties || {};
    const required = schema.required || [];

    if (Object.keys(properties).length === 0) {
      return 'Record<string, unknown>';
    }

    const props = Object.entries(properties).map(([key, value]: [string, any]) => {
      const isRequired = required.includes(key);
      const propType = schemaToTypeScript(value, components, indent + 1);
      const optional = isRequired ? '' : '?';
      return `${indentStr}  ${key}${optional}: ${propType};`;
    });

    return `{\n${props.join('\n')}\n${indentStr}}`;
  }

  // Handle primitives
  switch (schema.type) {
    case 'string':
      return 'string';
    case 'number':
    case 'integer':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'null':
      return 'null';
    default:
      return 'unknown';
  }
}

import { mkdirSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';

export async function generateApiClients(baseUrl: string, outputFiles: string[]): Promise<void> {
  if (outputFiles.length === 0) {
    throw new Error('At least one --out file must be specified');
  }

  try {
    // Fetch the OpenAPI schema from the server
    const response = await fetch(`${baseUrl}/openapi.json`);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch OpenAPI schema: ${response.status} ${response.statusText}\n` +
        `Make sure the Prism API server is running at ${baseUrl}`
      );
    }

    const schema = await response.json() as OpenAPISchema;

    const lines: string[] = [];
    const endpointMap: EndpointMapping[] = [];

    // Generate component schemas first
    if (schema.components?.schemas) {
      lines.push('// Component Schemas');
      for (const [name, componentSchema] of Object.entries(schema.components.schemas)) {
        const typeStr = schemaToTypeScript(componentSchema, schema.components.schemas);
        lines.push(`export type ${name} = ${typeStr};\n`);
      }
      lines.push('');
    }

    // Process each endpoint
    lines.push('// Endpoint Types');
    for (const [pathStr, pathItem] of Object.entries(schema.paths)) {
      for (const [method, operation] of Object.entries(pathItem)) {
        if (!operation.operationId) continue;

        const typeName = capitalizeFirst(operation.operationId);
        endpointMap.push({ method: method.toLowerCase(), path: pathStr, operationId: operation.operationId });

        // Generate Request type
        const requestSchema = operation.requestBody?.content?.['application/json']?.schema;
        const requestType = requestSchema
          ? schemaToTypeScript(requestSchema, schema.components?.schemas)
          : 'void';
        lines.push(`export type ${typeName}Request = ${requestType};\n`);

        // Generate Response type
        const responseSchema = operation.responses?.['200']?.content?.['application/json']?.schema;
        const responseType = responseSchema
          ? schemaToTypeScript(responseSchema, schema.components?.schemas)
          : 'void';
        lines.push(`export type ${typeName}Response = ${responseType};\n`);
      }
    }

    // Generate generic RequestType and ResponseType
    lines.push('// Generic Request/Response Types by Endpoint');
    lines.push('export type RequestType<T extends string> =');
    const requestCases = endpointMap.map(({ method, path, operationId }) =>
      `  T extends "${method} ${path}" ? ${capitalizeFirst(operationId)}Request :`
    );
    lines.push(requestCases.join('\n'));
    lines.push('  never;\n');

    lines.push('export type ResponseType<T extends string> =');
    const responseCases = endpointMap.map(({ method, path, operationId }) =>
      `  T extends "${method} ${path}" ? ${capitalizeFirst(operationId)}Response :`
    );
    lines.push(responseCases.join('\n'));
    lines.push('  never;\n');

    const output = lines.join('\n');

    // Add header comment
    const header = `// Generated API client types
// Auto-generated from OpenAPI schema - do not edit manually

`;

    const content = header + output;

    // Write to each output file
    for (const outputFile of outputFiles) {
      const resolvedPath = resolve(outputFile);
      mkdirSync(dirname(resolvedPath), { recursive: true });
      writeFileSync(resolvedPath, content, 'utf-8');
      console.log(`Written: ${resolvedPath}`);
    }
  } catch (error) {
    console.error('❌ Error generating client:', error);
    throw error;
  }
}
