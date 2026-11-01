// scripts/createLocales.mjs
import fs from 'node:fs';
import path from 'node:path';
import en from '../src/lib/locales/en.js';

const enKeys = Object.keys(en);
const targetDir = 'src/lib/locales';

// Base translations for common and agricultural phrases
const languages = ['bn', 'te', 'ta', 'mr', 'kn', 'gu', 'pa'];

// Let's create comprehensive dictionaries for each language
// We will write individual locale files with 100% key parity
console.log('Target languages:', languages.join(', '));
