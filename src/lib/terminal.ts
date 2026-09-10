export interface TerminalFile {
  path: string;
  title: string;
  body: string;
  href?: string;
  directory?: boolean;
}

export const commands = ['ls', 'cd', 'pwd', 'cat', 'open', 'man', 'help', 'clear', 'history', 'whoami', 'date', 'echo', 'neofetch', 'coffee', 'sudo', 'games', 'play'];

/** A virtual filesystem only: no user input is evaluated or sent to a shell. */
export function resolvePath(input: string, cwd: string): string {
  const expanded = input.replace(/^~(?=\/|$)/, '/').replace(/^\/home\/visitor(?=\/|$)/, '/');
  const parts = (expanded.startsWith('/') ? expanded : `${cwd}/${expanded}`).split('/');
  const result: string[] = [];
  for (const part of parts) {
    if (part === '..') result.pop();
    else if (part && part !== '.') result.push(part);
  }
  if (result[0] === 'project') result[0] = 'projects';
  return '/' + result.join('/');
}

export function children(files: TerminalFile[], path: string, hidden = false) {
  return files.filter((file) => file.path !== '/' && file.path.slice(0, file.path.lastIndexOf('/')) === (path === '/' ? '' : path)
    && (hidden || !file.path.split('/').pop()!.startsWith('.')));
}

export function findFile(files: TerminalFile[], path: string) {
  return files.find((file) => file.path === path || (!file.directory && file.path === `${path}.md`));
}

export function complete(input: string, cwd: string, files: TerminalFile[]): string[] {
  if (!input.includes(' ')) return commands.filter((command) => command.startsWith(input)).map((command) => command + ' ');
  const split = input.lastIndexOf(' ') + 1;
  const prefix = input.slice(0, split);
  const token = input.slice(split);
  const slash = token.lastIndexOf('/') + 1;
  const parent = token.slice(0, slash);
  const stem = token.slice(slash);
  return children(files, resolvePath(parent || '.', cwd), stem.startsWith('.'))
    .filter((file) => file.path.split('/').pop()!.startsWith(stem) && (!input.startsWith('cd ') || file.directory))
    .map((file) => prefix + parent + file.path.split('/').pop() + (file.directory ? '/' : ''));
}
