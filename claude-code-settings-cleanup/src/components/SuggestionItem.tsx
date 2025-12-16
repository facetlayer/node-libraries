import React from 'react';
import { Box, Text } from 'ink';
import type { Suggestion } from '../types.ts';

interface SuggestionItemProps {
  suggestion: Suggestion;
  isSelected: boolean;
  index: number;
}

function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'error':
      return 'red';
    case 'warning':
      return 'yellow';
    case 'info':
    default:
      return 'blue';
  }
}

function getSeverityIcon(severity: string): string {
  switch (severity) {
    case 'error':
      return '[!]';
    case 'warning':
      return '[*]';
    case 'info':
    default:
      return '[i]';
  }
}

export function SuggestionItem({ suggestion, isSelected, index }: SuggestionItemProps) {
  const color = getSeverityColor(suggestion.severity);
  const icon = getSeverityIcon(suggestion.severity);

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box>
        <Text color={isSelected ? 'green' : undefined}>
          {isSelected ? '> ' : '  '}
        </Text>
        <Text color={color} bold>
          {icon}
        </Text>
        <Text> </Text>
        <Text bold={isSelected}>
          {index + 1}. {suggestion.title}
        </Text>
      </Box>
      {isSelected && (
        <Box flexDirection="column" marginLeft={4}>
          <Text dimColor>{suggestion.description}</Text>
          {suggestion.affectedItems && suggestion.affectedItems.length > 0 && (
            <Box flexDirection="column" marginTop={1}>
              <Text color="cyan">Affected items:</Text>
              {suggestion.affectedItems.map((item, i) => (
                <Text key={i} dimColor>
                  {'  '}- {item}
                </Text>
              ))}
            </Box>
          )}
          {suggestion.action ? (
            <Box marginTop={1}>
              <Text color="magenta">
                Press Enter to {suggestion.action.type}: {suggestion.action.rules.join(', ')}
                {suggestion.action.newRule && ` -> ${suggestion.action.newRule}`}
              </Text>
            </Box>
          ) : (
            <Box marginTop={1}>
              <Text dimColor>(No automatic action available)</Text>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}
