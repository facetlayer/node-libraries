export interface HintFrontMatter {
  name: string;
  description: string;
}

export interface HintFile {
  filePath: string;
  name: string;
  description: string;
  content: string;
  rawContent: string;
}
