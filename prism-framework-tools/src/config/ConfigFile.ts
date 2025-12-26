export interface GenerateApiClientTarget {
  outputFile: string;
}

export interface ConfigFile {
  generateApiClientTargets: GenerateApiClientTarget[];
}
