export type AppCommand = 'new-note' | 'today';

const commandArguments: Record<string, AppCommand> = {
  '--new-note': 'new-note',
  '--today': 'today',
};

export function parseLaunchCommands(commandLine: readonly string[]): AppCommand[] {
  return commandLine.flatMap(argument => commandArguments[argument] ? [commandArguments[argument]] : []);
}
