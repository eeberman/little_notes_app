import { expect, test } from 'vitest';
import { parseLaunchCommands } from '../src/main/launchCommands';

test('parses only allowlisted launch commands in command-line order', () => {
  expect(parseLaunchCommands([
    'Getting Stuff Done.exe', '--unknown', '--today', '--new-note', '--inspect=0'
  ])).toEqual(['today', 'new-note']);
});

test('returns no commands for an ordinary launch', () => {
  expect(parseLaunchCommands(['Getting Stuff Done.exe'])).toEqual([]);
});
