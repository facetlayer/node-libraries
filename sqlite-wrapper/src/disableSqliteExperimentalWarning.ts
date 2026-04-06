export function disableSqliteExperimentalWarning() {
  if ((process.emit as any).__sqliteWarningDisabled) return;

  const originalEmit = process.emit;
  // @ts-ignore - overriding process.emit
  process.emit = function disableSqliteExperimentalWarning(event: string, warning: any) {
    if (event === 'warning' && warning?.name === 'ExperimentalWarning'
        && warning?.message?.toLowerCase().includes('sqlite')) {
      return false;
    }
    return originalEmit.apply(process, arguments as any);
  };
  (process.emit as any).__sqliteWarningDisabled = true;
}

// Auto-apply on import so that node:sqlite can be loaded without warnings
disableSqliteExperimentalWarning();
