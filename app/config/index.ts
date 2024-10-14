import * as fs from 'fs';
import * as path from 'path';

export const config = JSON.parse(fs.readFileSync(path.resolve(__dirname, './config.json'), 'utf-8'));
