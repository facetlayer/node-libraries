import { execSync } from 'child_process';

export interface OpenItermRequest {
  /** Command(s) to run in the new window */
  initialCommand: string;
  /** Name for the iTerm window/session */
  windowName: string;
}

/**
 * Opens a new iTerm window and runs the specified command.
 *
 * @param request - Configuration for the new window
 */
export function openItermWindow(request: OpenItermRequest): void {
  console.log(`Opening iTerm window: ${request.windowName}`);

  // Escape special characters for AppleScript
  const escapedCommands = request.initialCommand
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/'/g, "'");
  const escapedWindowName = request.windowName.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

  const osaScript = `
        tell application "iTerm"
            create window with default profile
            tell current session of current window
                set name to "${escapedWindowName}"
                write text "${escapedCommands}"
            end tell
        end tell
    `;
  execSync(`osascript -e '${osaScript}'`);
}
