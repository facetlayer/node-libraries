import { readFileSync, writeFileSync } from 'fs';
import { parse } from 'dotenv';

export class EnvFileRewrite {
  private originalFilename: string;
  private parsedEnv: Record<string, string>;
  private modifications: Map<string, string>;
  private originalContent: string;

  constructor(filename: string) {
    this.originalFilename = filename;
    this.modifications = new Map();

    this.originalContent = readFileSync(filename, 'utf8');

    const parseResult = parse(this.originalContent);
    this.parsedEnv = parseResult;
  }

  get(varName: string): string | undefined {
    if (this.modifications.has(varName)) {
      return this.modifications.get(varName);
    }
    return this.parsedEnv[varName];
  }

  set(varName: string, newValue: string): void {
    this.modifications.set(varName, newValue);
  }

  save(filename?: string): void {
    const targetFilename = filename || this.originalFilename;

    let updatedContent = this.originalContent;

    for (const [varName, newValue] of this.modifications.entries()) {
      const regex = new RegExp(`^${escapeRegex(varName)}=.*$`, 'gm');
      const replacement = `${varName}=${newValue}`;

      const match = updatedContent.match(regex);
      if (match) {
        updatedContent = updatedContent.replace(regex, replacement);
      } else {
        if (!updatedContent.endsWith('\n')) {
          updatedContent += '\n';
        }
        updatedContent += `${replacement}\n`;
      }
    }

    writeFileSync(targetFilename, updatedContent, 'utf8');
  }
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
