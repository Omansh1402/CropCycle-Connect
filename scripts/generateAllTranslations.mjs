// scripts/generateAllTranslations.mjs
import fs from 'fs';
import path from 'path';

const i18nDataPath = path.resolve('src/lib/i18nData.js');
let content = fs.readFileSync(i18nDataPath, 'utf8');

console.log('Original i18nData.js size:', content.length);
