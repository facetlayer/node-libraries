import React from 'react';
import { Box, Text } from 'ink';
import type { SettingsFile } from '../types.ts';

interface FileStatusProps {
  file: SettingsFile;
  label: string;
}

export function FileStatus({ file, label }: FileStatusProps) {
  const statusIcon = file.exists ? (file.parseError ? 'X' : '+') : '-';
  const statusColor = file.exists ? (file.parseError ? 'red' : 'green') : 'gray';

  const permCount = file.content?.permissions
    ? (file.content.permissions.allow?.length || 0) +
      (file.content.permissions.deny?.length || 0) +
      (file.content.permissions.ask?.length || 0)
    : 0;

  return (
    <Box>
      <Text color={statusColor}>[{statusIcon}]</Text>
      <Text> {label}: </Text>
      {file.exists ? (
        file.parseError ? (
          <Text color="red">Parse error</Text>
        ) : (
          <Text color="green">
            {permCount} permission{permCount !== 1 ? 's' : ''}
          </Text>
        )
      ) : (
        <Text dimColor>Not found</Text>
      )}
    </Box>
  );
}
