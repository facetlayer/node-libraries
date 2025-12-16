import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import type { AnalysisResult } from '../types.ts';
import { App } from './App.tsx';

interface AppWithLoadingProps {
  projectPath: string;
  analyzeFunction: (path: string) => Promise<AnalysisResult>;
}

export function AppWithLoading({ projectPath, analyzeFunction }: AppWithLoadingProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    analyzeFunction(projectPath)
      .then((analysisResult) => {
        setResult(analysisResult);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : String(err));
        setIsLoading(false);
      });
  }, [projectPath, analyzeFunction]);

  if (isLoading) {
    return (
      <Box flexDirection="column" padding={1}>
        <Box marginBottom={1}>
          <Text bold color="cyan">
            Claude Settings Tidier
          </Text>
        </Box>
        <Box>
          <Text color="green">
            <Spinner type="dots" />
          </Text>
          <Text> Analyzing settings with AI...</Text>
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Box flexDirection="column" padding={1}>
        <Box marginBottom={1}>
          <Text bold color="cyan">
            Claude Settings Tidier
          </Text>
        </Box>
        <Box>
          <Text color="red">Error: {error}</Text>
        </Box>
      </Box>
    );
  }

  if (!result) {
    return null;
  }

  return <App analysisResult={result} projectPath={projectPath} />;
}
