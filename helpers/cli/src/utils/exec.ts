import { exec as _exec } from 'child_process';
import { EOL } from 'os';

export async function exec(cmd: string): Promise<string[]> {
  return new Promise((res, rej) => {
    _exec(cmd, (error, stdOut) => {
      if (error) {
        return rej(error);
      }
      const lines = (typeof stdOut === 'string' && stdOut.split(EOL)) || [];
      res(lines);
    });
  });
}
