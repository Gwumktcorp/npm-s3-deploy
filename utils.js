import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'path';

export const HOME_DIR = os.homedir();

export async function createHiddenDir(dirname) {
	await fs.mkdir(path.join(HOME_DIR, dirname)).catch(() => {});
}
