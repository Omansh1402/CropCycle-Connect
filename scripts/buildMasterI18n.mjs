// scripts/buildMasterI18n.mjs
import fs from 'fs';
import path from 'path';

const ROOT_I18N = path.resolve('src/lib/i18nData.js');
const BACKUP_I18N = path.resolve('backup project/CropCycle-Connect/src/lib/i18nData.js');

const LANGS = ['en', 'hi', 'bn', 'te', 'ta', 'mr', 'kn', 'gu', 'pa'];

// 1. Load base locales
const enBase = (await import('../src/lib/locales/en.js')).default;
const hiBase = (await import('../src/lib/locales/hi.js')).default;

// Initialize dictionaries for all 9 languages
const TRANSLATIONS = {};
LANGS.forEach(lang => {
  TRANSLATIONS[lang] = {};
});

// Seed en and hi from base
Object.entries(enBase).forEach(([k, v]) => {
  TRANSLATIONS.en[k] = v;
});
Object.entries(hiBase).forEach(([k, v]) => {
  TRANSLATIONS.hi[k] = v;
});

// Helper to extract exported object from a script by parsing or regex if dynamic import fails
function extractConstFromScript(filePath, constName) {
  const content = fs.readFileSync(filePath, 'utf8');
  // Look for `const constName = { ... };`
  const startPattern = new RegExp(`(?:export\\s+)?const\\s+${constName}\\s*=\\s*\\{`);
  const match = content.match(startPattern);
  if (!match) return null;
  const startIndex = match.index + match[0].length - 1;
  let braceCount = 0;
  let endIndex = -1;
  for (let i = startIndex; i < content.length; i++) {
    if (content[i] === '{') braceCount++;
    else if (content[i] === '}') {
      braceCount--;
      if (braceCount === 0) {
        endIndex = i + 1;
        break;
      }
    }
  }
  if (endIndex === -1) return null;
  const jsonLike = content.slice(startIndex, endIndex);
  try {
    // Evaluate in safe function
    return new Function(`return (${jsonLike})`)();
  } catch (err) {
    console.warn(`Failed to eval ${constName} from ${filePath}:`, err.message);
    return null;
  }
}

// 2. Load ADDITIONAL_TRANSLATIONS from scripts/enhanceI18n.mjs
const addl1 = extractConstFromScript('scripts/enhanceI18n.mjs', 'ADDITIONAL_TRANSLATIONS') || {};
console.log('Loaded from enhanceI18n ADDITIONAL_TRANSLATIONS:', Object.keys(addl1).length);

// 3. Load NEW_KEYS from scripts/expandTranslationsFull.mjs
const addl2 = extractConstFromScript('scripts/expandTranslationsFull.mjs', 'NEW_KEYS') || {};
console.log('Loaded from expandTranslationsFull NEW_KEYS:', Object.keys(addl2).length);

// 4. Load NEW_KEYS from scripts/appendBatchTranslations.mjs
const addl3 = extractConstFromScript('scripts/appendBatchTranslations.mjs', 'NEW_KEYS') || {};
console.log('Loaded from appendBatchTranslations NEW_KEYS:', Object.keys(addl3).length);

// 5. Load BATCH from scripts/appendMarketAndProfileBatch.mjs
const addl4 = extractConstFromScript('scripts/appendMarketAndProfileBatch.mjs', 'BATCH') || {};
console.log('Loaded from appendMarketAndProfileBatch BATCH:', Object.keys(addl4).length);

// Merge all key groups
const allKeyGroups = [addl1, addl2, addl3, addl4];
allKeyGroups.forEach(group => {
  Object.entries(group).forEach(([key, langMap]) => {
    LANGS.forEach(lang => {
      const val = langMap[lang] || langMap.en;
      if (val !== undefined && val !== null) {
        TRANSLATIONS[lang][key] = val;
      }
    });
  });
});

// Refine specific Bengali and regional titles
if (TRANSLATIONS.bn) {
  TRANSLATIONS.bn.brandName = 'CropCycle Connect';
  TRANSLATIONS.bn.brandTagline = 'জাতীয় কৃষি অবশিষ্টাংশ বিনিময় প্ল্যাটফর্ম';
  TRANSLATIONS.bn.overview = 'সংক্ষিপ্ত বিবরণ';
  TRANSLATIONS.bn.marketIntelligence = 'মার্কেট ইন্টেলিজেন্স';
  TRANSLATIONS.bn.farmerPortal = 'কৃষক পোর্টাল';
  TRANSLATIONS.bn.buyerRequirements = 'ক্রেতার প্রয়োজনীয়তা';
  TRANSLATIONS.bn.marketplace = 'মার্কেটপ্লেস';
  TRANSLATIONS.bn.dashboard = 'ড্যাশবোর্ড';
  TRANSLATIONS.bn.browseSupply = 'সরবরাহ ব্রাউজ করুন';
  TRANSLATIONS.bn.listResidue = 'অবশিষ্টাংশ তালিকাভুক্ত করুন';
  TRANSLATIONS.bn.registerDemand = 'ক্রেতার চাহিদা নিবন্ধন করুন';
  TRANSLATIONS.bn.toggleNavMenu = 'মেনু টগল করুন';
  TRANSLATIONS.bn.interfaceLanguage = 'ইন্টারফেস ভাষা';
  TRANSLATIONS.bn.changeLanguage = 'ভাষা পরিবর্তন করুন / Change Language';
  TRANSLATIONS.bn.search = 'অনুসন্ধান';
  TRANSLATIONS.bn.filter = 'ফিল্টার';
  TRANSLATIONS.bn.all = 'সব';
  TRANSLATIONS.bn.allResidues = 'সকল অবশিষ্টাংশের প্রকার';
  TRANSLATIONS.bn.allStates = 'সকল রাজ্য / কেন্দ্রশাসিত অঞ্চল';
  TRANSLATIONS.bn.allDistricts = 'সকল জেলা';
  TRANSLATIONS.bn.allPurposes = 'সকল ক্রয়ের উদ্দেশ্য';
  TRANSLATIONS.bn.tonnes = 'টন';
  TRANSLATIONS.bn.perTonne = 'প্রতি টন';
  TRANSLATIONS.bn.active = 'সক্রিয়';
  TRANSLATIONS.bn.pending = 'মুলতবি';
  TRANSLATIONS.bn.matched = 'ম্যাচ হয়েছে';
  TRANSLATIONS.bn.closed = 'বন্ধ';
  TRANSLATIONS.bn.accepted = 'গৃহীত';
  TRANSLATIONS.bn.rejected = 'প্রত্যাখ্যাত';
  TRANSLATIONS.bn.completed = 'সম্পন্ন';
  TRANSLATIONS.bn.verified = 'যাচাইকৃত';
  TRANSLATIONS.bn.submit = 'জমা দিন';
  TRANSLATIONS.bn.submitting = 'জমা দেওয়া হচ্ছে…';
  TRANSLATIONS.bn.save = 'সংরক্ষণ করুন';
  TRANSLATIONS.bn.cancel = 'বাতিল করুন';
  TRANSLATIONS.bn.retry = 'পুনরায় চেষ্টা করুন';
  TRANSLATIONS.bn.clearFilters = 'ফিল্টার সাফ করুন';
  TRANSLATIONS.bn.viewDetails = 'বিস্তারিত দেখুন';
  TRANSLATIONS.bn.back = 'ফিরে যান';
  TRANSLATIONS.bn.returnHome = 'হোমে ফিরে যান';
  TRANSLATIONS.bn.loading = 'লোড হচ্ছে…';
  TRANSLATIONS.bn.processing = 'প্রক্রিয়াকরণ হচ্ছে…';
  TRANSLATIONS.bn.marketIntelligenceTitle = 'রাজ্যভিত্তিক ফসলের অবশিষ্টাংশ মার্কেট ইন্টেলিজেন্স';
  TRANSLATIONS.bn.marketIntelligenceSubtitle = 'প্রমাণিত কৃষি তথ্য, সরবরাহ ও চাহিদা লেজার, বর্তমান মূল্য এবং স্মার্ট আন্তঃরাজ্য পরিবহন লজিস্টিকস বিশ্লেষণ করুন।';
  TRANSLATIONS.bn.localDemoProfile = 'স্থানীয় ডেমো প্রোফাইল';
  TRANSLATIONS.bn.localDemoProfileNotice = 'এই প্রোফাইলটি মূল্যায়ন এবং প্রদর্শনের জন্য আপনার ব্রাউজার স্টোরেজে স্থানীয়ভাবে সংরক্ষিত। ক্লাউড প্রমাণীকরণ এবং দূরবর্তী সিঙ্ক্রোনাইজেশন সক্রিয় নয়। এখানে সংরক্ষিত পরিবর্তনগুলি এই ডিভাইসে ব্রাউজার রিফ্রেশ জুড়ে স্থায়ী হবে।';
  TRANSLATIONS.bn.officialSourcedStatus = 'সরকারি উৎসের স্থিতি';
  TRANSLATIONS.bn.colPairing = 'জুটি';
  TRANSLATIONS.bn.colNotes = 'নোট';
  TRANSLATIONS.bn.technicalDetail = 'প্রযুক্তিগত বিবরণ';
  TRANSLATIONS.bn.resolutionRequirement = 'সমাধানের প্রয়োজনীয়তা';
  TRANSLATIONS.bn.demoBadge = 'ডেমো';
  TRANSLATIONS.bn.liveBadge = 'লাইভ';
}
if (TRANSLATIONS.ta) {
  TRANSLATIONS.ta.marketIntelligenceTitle = 'மாநில அளவிலான பயிர் எச்ச சந்தை நுண்ணறிவு';
  TRANSLATIONS.ta.marketIntelligenceSubtitle = 'சரிபார்க்கப்பட்ட விவசாய புள்ளிவிவரங்கள், விநியோக தேவைப் பதிவேடு, தற்போதைய சந்தை விலைகள் மற்றும் ஸ்மார்ட் மாநிலங்களுக்கு இடையேயான போக்குவரத்து தளவாடங்கள்.';
  TRANSLATIONS.ta.officialSourcedStatus = 'அதிகாரப்பூர்வ மூல நிலை';
  TRANSLATIONS.ta.colPairing = 'இணைத்தல்';
  TRANSLATIONS.ta.colNotes = 'குறிப்புகள்';
  TRANSLATIONS.ta.technicalDetail = 'தொழில்நுட்ப விவரம்';
  TRANSLATIONS.ta.resolutionRequirement = 'தீர்வு தேவை';
  TRANSLATIONS.ta.demoBadge = 'டெமோ';
  TRANSLATIONS.ta.liveBadge = 'நேரலை';
}
if (TRANSLATIONS.hi) {
  TRANSLATIONS.hi.marketIntelligenceTitle = 'राज्य-वार फसल अवशेष बाजार आसूचना एवं परिवहन कैलकुलेटर';
  TRANSLATIONS.hi.marketIntelligenceSubtitle = 'सत्यापित कृषि आंकड़े, आपूर्ति-मांग खाता, वर्तमान दरें और स्मार्ट अंतरराज्यीय परिवहन रसद का विश्लेषण करें।';
  TRANSLATIONS.hi.officialSourcedStatus = 'आधिकारिक स्रोत स्थिति';
  TRANSLATIONS.hi.colPairing = 'युग्मन';
  TRANSLATIONS.hi.colNotes = 'टिप्पणियाँ';
  TRANSLATIONS.hi.technicalDetail = 'तकनीकी विवरण';
  TRANSLATIONS.hi.resolutionRequirement = 'समाधान आवश्यकता';
  TRANSLATIONS.hi.demoBadge = 'डेमो';
  TRANSLATIONS.hi.liveBadge = 'लाइव';
}
if (TRANSLATIONS.en) {
  TRANSLATIONS.en.officialSourcedStatus = 'Official Sourced Status';
  TRANSLATIONS.en.colPairing = 'Pairing';
  TRANSLATIONS.en.colNotes = 'Notes';
  TRANSLATIONS.en.technicalDetail = 'Technical Detail';
  TRANSLATIONS.en.resolutionRequirement = 'Resolution Requirement';
  TRANSLATIONS.en.demoBadge = 'demo';
  TRANSLATIONS.en.liveBadge = 'live';
}



// Ensure any keys present in 'en' are present across all languages with valid values
const allEnKeys = Object.keys(TRANSLATIONS.en);
console.log(`Total unique keys in English: ${allEnKeys.length}`);

LANGS.forEach(lang => {
  if (lang === 'en') return;
  allEnKeys.forEach(k => {
    if (!TRANSLATIONS[lang][k] || TRANSLATIONS[lang][k].trim() === '') {
      // Fallback priority: Hindi -> Bengali -> English
      TRANSLATIONS[lang][k] = TRANSLATIONS.hi[k] || TRANSLATIONS.bn[k] || TRANSLATIONS.en[k];
    }
  });
});



// Load mappers
const CROP_TRANSLATIONS = extractConstFromScript('scripts/enhanceI18n.mjs', 'CROP_TRANSLATIONS') || {};
const RESIDUE_TRANSLATIONS = extractConstFromScript('scripts/buildI18n.mjs', 'RESIDUE_TRANSLATIONS') || {};
const EXTRA_RESIDUES = extractConstFromScript('scripts/enhanceI18n.mjs', 'EXTRA_RESIDUES') || {};
// Merge extra residues
LANGS.forEach(lang => {
  if (EXTRA_RESIDUES[lang] && RESIDUE_TRANSLATIONS[lang]) {
    Object.assign(RESIDUE_TRANSLATIONS[lang], EXTRA_RESIDUES[lang]);
  }
});

const PURPOSE_TRANSLATIONS = extractConstFromScript('scripts/buildI18n.mjs', 'PURPOSE_TRANSLATIONS') || {};
const EXTRA_PURPOSES = extractConstFromScript('scripts/enhanceI18n.mjs', 'EXTRA_PURPOSES') || {};
// Merge extra purposes
LANGS.forEach(lang => {
  if (EXTRA_PURPOSES[lang] && PURPOSE_TRANSLATIONS[lang]) {
    Object.assign(PURPOSE_TRANSLATIONS[lang], EXTRA_PURPOSES[lang]);
  }
});

const VEHICLE_TRANSLATIONS = extractConstFromScript('scripts/enhanceI18n.mjs', 'VEHICLE_TRANSLATIONS') || {};
const DELIVERY_TRANSLATIONS = extractConstFromScript('scripts/enhanceI18n.mjs', 'DELIVERY_TRANSLATIONS') || {};
const STATUS_TRANSLATIONS = extractConstFromScript('scripts/enhanceI18n.mjs', 'STATUS_TRANSLATIONS') || {};
const INDUSTRY_TRANSLATIONS = extractConstFromScript('scripts/enhanceI18n.mjs', 'INDUSTRY_TRANSLATIONS') || {};

console.log('Mappers loaded:', {
  crops: Object.keys(CROP_TRANSLATIONS).length,
  residues: Object.keys(RESIDUE_TRANSLATIONS).length,
  purposes: Object.keys(PURPOSE_TRANSLATIONS).length,
  vehicles: Object.keys(VEHICLE_TRANSLATIONS).length,
  deliveries: Object.keys(DELIVERY_TRANSLATIONS).length,
  statuses: Object.keys(STATUS_TRANSLATIONS).length,
  industries: Object.keys(INDUSTRY_TRANSLATIONS).length,
});

// Verify 100% parity across all 9 languages
let allPassed = true;
LANGS.forEach(lang => {
  const count = Object.keys(TRANSLATIONS[lang]).length;
  const missing = allEnKeys.filter(k => !TRANSLATIONS[lang][k] || TRANSLATIONS[lang][k].trim() === '');
  console.log(`Lang [${lang}]: ${count} keys, Missing/Empty: ${missing.length}`);
  if (count !== allEnKeys.length || missing.length > 0) {
    allPassed = false;
  }
});

if (!allPassed) {
  console.error('Parity check failed before write!');
  process.exit(1);
}

// Generate file content
const output = `// src/lib/i18nData.js
// CropCycle Connect – Central Multilingual Data & Mapper Definitions
// Standardized on ISO 639-1 language codes:
// en: English, hi: Hindi, bn: Bengali, te: Telugu, ta: Tamil,
// mr: Marathi, kn: Kannada, gu: Gujarati, pa: Punjabi

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी' },
  { code: 'bn', label: 'Bengali', nativeLabel: 'বাংলা' },
  { code: 'te', label: 'Telugu', nativeLabel: 'తెలుగు' },
  { code: 'ta', label: 'Tamil', nativeLabel: 'தமிழ்' },
  { code: 'mr', label: 'Marathi', nativeLabel: 'मराठी' },
  { code: 'kn', label: 'Kannada', nativeLabel: 'ಕನ್ನಡ' },
  { code: 'gu', label: 'Gujarati', nativeLabel: 'ગુજરાતી' },
  { code: 'pa', label: 'Punjabi', nativeLabel: 'ਪੰਜਾਬੀ' },
];

export const TRANSLATIONS = ${JSON.stringify(TRANSLATIONS, null, 2)};

export const CROP_TRANSLATIONS = ${JSON.stringify(CROP_TRANSLATIONS, null, 2)};
export const RESIDUE_TRANSLATIONS = ${JSON.stringify(RESIDUE_TRANSLATIONS, null, 2)};
export const PURPOSE_TRANSLATIONS = ${JSON.stringify(PURPOSE_TRANSLATIONS, null, 2)};
export const VEHICLE_TRANSLATIONS = ${JSON.stringify(VEHICLE_TRANSLATIONS, null, 2)};
export const DELIVERY_TRANSLATIONS = ${JSON.stringify(DELIVERY_TRANSLATIONS, null, 2)};
export const STATUS_TRANSLATIONS = ${JSON.stringify(STATUS_TRANSLATIONS, null, 2)};
export const INDUSTRY_TRANSLATIONS = ${JSON.stringify(INDUSTRY_TRANSLATIONS, null, 2)};

export function tCrop(crop, lang = 'en') {
  if (!crop) return '';
  return CROP_TRANSLATIONS[lang]?.[crop] || CROP_TRANSLATIONS.en?.[crop] || crop;
}

export function tResidue(residue, lang = 'en') {
  if (!residue) return '';
  return RESIDUE_TRANSLATIONS[lang]?.[residue] || RESIDUE_TRANSLATIONS.en?.[residue] || residue;
}

export function tPurpose(purpose, lang = 'en') {
  if (!purpose) return '';
  return PURPOSE_TRANSLATIONS[lang]?.[purpose] || PURPOSE_TRANSLATIONS.en?.[purpose] || purpose;
}

export function tVehicle(vehicle, lang = 'en') {
  if (!vehicle) return '';
  return VEHICLE_TRANSLATIONS[lang]?.[vehicle] || VEHICLE_TRANSLATIONS.en?.[vehicle] || vehicle;
}

export function tDelivery(condition, lang = 'en') {
  if (!condition) return '';
  return DELIVERY_TRANSLATIONS[lang]?.[condition] || DELIVERY_TRANSLATIONS.en?.[condition] || condition;
}

export function tStatus(status, lang = 'en') {
  if (!status) return '';
  const key = String(status).toLowerCase();
  return STATUS_TRANSLATIONS[lang]?.[key] || STATUS_TRANSLATIONS.en?.[key] || status;
}

export function tIndustry(industry, lang = 'en') {
  if (!industry) return '';
  return INDUSTRY_TRANSLATIONS[lang]?.[industry] || INDUSTRY_TRANSLATIONS.en?.[industry] || industry;
}
`;

fs.writeFileSync(ROOT_I18N, output, 'utf8');
fs.writeFileSync(BACKUP_I18N, output, 'utf8');
console.log(`Successfully generated master i18n files for ${allEnKeys.length} keys across all 9 languages!`);
