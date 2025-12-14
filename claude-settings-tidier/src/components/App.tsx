import React, { useState } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import type { AnalysisResult, Suggestion } from '../types.ts';
import { applySuggestion } from '../analyzer/applySuggestion.ts';
import { FileStatus } from './FileStatus.tsx';
import { SuggestionItem } from './SuggestionItem.tsx';

interface AppProps {
  analysisResult: AnalysisResult;
  projectPath: string;
}

export function App({ analysisResult, projectPath }: AppProps) {
  const { exit } = useApp();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [suggestions, setSuggestions] = useState<Suggestion[]>(analysisResult.suggestions);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const { settingsFile, localSettingsFile } = analysisResult;

  useInput((input, key) => {
    if (input === 'q' || key.escape) {
      exit();
      return;
    }

    if (suggestions.length === 0) return;

    if (key.upArrow || input === 'k') {
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : suggestions.length - 1));
      setStatusMessage(null);
    }

    if (key.downArrow || input === 'j') {
      setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : 0));
      setStatusMessage(null);
    }

    if (key.return) {
      const currentSuggestion = suggestions[selectedIndex];
      if (currentSuggestion?.action) {
        try {
          const result = applySuggestion(projectPath, currentSuggestion.action);
          setStatusMessage(`Applied: ${result}`);
          // Remove the applied suggestion
          setSuggestions(prev => prev.filter((_, i) => i !== selectedIndex));
          // Adjust selected index if needed
          setSelectedIndex(prev => Math.min(prev, suggestions.length - 2));
        } catch (err) {
          setStatusMessage(`Error: ${err instanceof Error ? err.message : String(err)}`);
        }
      } else {
        setStatusMessage('This suggestion has no automatic action');
      }
    }
  });

  const errorCount = suggestions.filter(s => s.severity === 'error').length;
  const warningCount = suggestions.filter(s => s.severity === 'warning').length;
  const infoCount = suggestions.filter(s => s.severity === 'info').length;

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">
          Claude Settings Tidier
        </Text>
      </Box>

      <Box marginBottom={1}>
        <Text dimColor>Project: {projectPath}</Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Text bold>Files:</Text>
        <FileStatus file={settingsFile} label="settings.json" />
        <FileStatus file={localSettingsFile} label="settings.local.json" />
      </Box>

      <Box marginBottom={1}>
        <Text bold>Summary: </Text>
        {suggestions.length === 0 ? (
          <Text color="green">No issues found!</Text>
        ) : (
          <>
            {errorCount > 0 && (
              <Text color="red">
                {errorCount} error{errorCount !== 1 ? 's' : ''}
              </Text>
            )}
            {errorCount > 0 && (warningCount > 0 || infoCount > 0) && <Text>, </Text>}
            {warningCount > 0 && (
              <Text color="yellow">
                {warningCount} warning{warningCount !== 1 ? 's' : ''}
              </Text>
            )}
            {warningCount > 0 && infoCount > 0 && <Text>, </Text>}
            {infoCount > 0 && (
              <Text color="blue">
                {infoCount} suggestion{infoCount !== 1 ? 's' : ''}
              </Text>
            )}
          </>
        )}
      </Box>

      {suggestions.length > 0 && (
        <>
          <Box marginBottom={1}>
            <Text bold>Suggestions:</Text>
          </Box>
          <Box flexDirection="column">
            {suggestions.map((suggestion, index) => (
              <SuggestionItem
                key={suggestion.id}
                suggestion={suggestion}
                isSelected={index === selectedIndex}
                index={index}
              />
            ))}
          </Box>
        </>
      )}

      {statusMessage && (
        <Box marginTop={1}>
          <Text color={statusMessage.startsWith('Error') ? 'red' : 'green'}>
            {statusMessage}
          </Text>
        </Box>
      )}

      <Box marginTop={1} borderStyle="single" borderColor="gray" paddingX={1}>
        <Text dimColor>
          {suggestions.length > 0
            ? 'j/k: navigate | Enter: apply | q: exit'
            : 'Press q or Esc to exit.'}
        </Text>
      </Box>
    </Box>
  );
}
