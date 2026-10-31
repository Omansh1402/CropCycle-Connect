// src/lib/i18nData.js
// ─────────────────────────────────────────────────────────────────
// CropCycle Connect – Six-Language Translation Dictionaries
// Supported: en (English), hi (Hindi), pa (Punjabi), gu (Gujarati), mr (Marathi), ta (Tamil)
// ─────────────────────────────────────────────────────────────────

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी' },
  { code: 'pa', label: 'Punjabi', nativeLabel: 'ਪੰਜਾਬੀ' },
  { code: 'gu', label: 'Gujarati', nativeLabel: 'ગુજરાતી' },
  { code: 'mr', label: 'Marathi', nativeLabel: 'मराठी' },
  { code: 'ta', label: 'Tamil', nativeLabel: 'தமிழ்' },
];

export const TRANSLATIONS = {
  en: {
    // Navigation
    overview: 'Overview',
    marketIntelligence: 'Market Intelligence',
    farmerPortal: 'Farmer Portal',
    buyerRequirements: 'Buyer Requirements',
    marketplace: 'Marketplace',
    dashboard: 'Dashboard',

    // Titles & Subtitles
    marketIntelligenceTitle: 'Crop Residue Market Intelligence & Logistics Cost Calculator',
    marketIntelligenceSubtitle: 'State-wise agricultural statistics, live platform supply-demand ledger, buying & selling rates, and turnkey interstate transportation calculation.',

    // Selectors
    selectState: 'Select Indian State / UT',
    selectDistrict: 'Select District',
    selectResidueType: 'Crop Residue Type',
    buyerPurpose: 'Buyer Purchasing Purpose',

    // Commercial Terms
    farmerAskingPrice: 'Farmer Asking Price',
    buyerOfferedPrice: 'Buyer Offered Price',
    referencePrice: 'Statutory Reference Rate',
    deliveredCost: 'Delivered Cost Per Tonne',
    transportCost: 'Transportation Cost',
    roadDistance: 'Road Travel Distance',
    vehicleTier: 'Vehicle Profile',
    requiredTrips: 'Required Trips',
    farmGate: 'Farm-Gate (ex-field)',
    exWarehouse: 'Ex-Warehouse (storage site)',
    delivered: 'Delivered (at facility)',

    // Logistics Notice
    indicativeDisclaimer: 'Indicative Transportation Estimate — Confirm Final Price With Transporter.',
  },

  hi: {
    overview: 'अवलोकन',
    marketIntelligence: 'मार्केट इंटेलिजेंस',
    farmerPortal: 'किसान पोर्टल',
    buyerRequirements: 'खरीदार आवश्यकताएं',
    marketplace: 'मार्केटप्लेस',
    dashboard: 'डैशबोर्ड',

    marketIntelligenceTitle: 'फसल अवशेष मार्केट इंटेलिजेंस एवं परिवहन लागत कैलकुलेटर',
    marketIntelligenceSubtitle: 'राज्यवार कृषि आंकड़े, लाइव प्लेटफॉर्म आपूर्ति-मांग बहीखाता, खरीद-बिक्री दरें और अंतर-राज्यीय परिवहन लागत।',

    selectState: 'राज्य / केंद्र शासित प्रदेश चुनें',
    selectDistrict: 'जिला चुनें',
    selectResidueType: 'फसल अवशेष का प्रकार',
    buyerPurpose: 'खरीद का उद्देश्य',

    farmerAskingPrice: 'किसान की अपेक्षित दर',
    buyerOfferedPrice: 'खरीदार की प्रस्तावित दर',
    referencePrice: 'आधिकारिक संदर्भ दर',
    deliveredCost: 'अंतिम डिलीवर मूल्य प्रति टन',
    transportCost: 'परिवहन लागत',
    roadDistance: 'सड़क मार्ग दूरी',
    vehicleTier: 'वाहन प्रोफ़ाइल',
    requiredTrips: 'आवश्यक ट्रिप संख्या',
    farmGate: 'फार्म-गेट (खेत पर)',
    exWarehouse: 'गोदाम (एक्स-वेयरहाउस)',
    delivered: 'डिलीवर (फैक्टरी परिसर)',

    indicativeDisclaimer: 'सांकेतिक परिवहन अनुमान — अंतिम मूल्य की पुष्टि ट्रांसपोर्टर से करें।',
  },

  pa: {
    overview: 'ਜਾਇਜ਼ਾ',
    marketIntelligence: 'ਮਾਰਕੀਟ ਇੰਟੈਲੀਜੈਂਸ',
    farmerPortal: 'ਕਿਸਾਨ ਪੋਰਟਲ',
    buyerRequirements: 'ਖਰੀਦਦਾਰ ਲੋੜਾਂ',
    marketplace: 'ਮੰਡੀ (ਮਾਰਕੀਟਪਲੇਸ)',
    dashboard: 'ਡੈਸ਼ਬੋਰਡ',

    marketIntelligenceTitle: 'ਫਸਲੀ ਰਹਿੰਦ-ਖੂੰਹਦ ਮਾਰਕੀਟ ਇੰਟੈਲੀਜੈਂਸ ਅਤੇ ਢੋਆ-ਢੁਆਈ ਕੈਲਕੁਲੇਟਰ',
    marketIntelligenceSubtitle: 'ਰਾਜ-ਵਾਰ ਖੇਤੀਬਾੜੀ ਅੰਕੜੇ, ਲਾਈਵ ਸਪਲਾਈ-ਮੰਗ ਲੇਖਾ, ਖਰੀਦ-ਵੇਚ ਦਰਾਂ ਅਤੇ ਅੰਤਰ-ਰਾਜੀ ਢੋਆ-ਢੁਆਈ ਲਾਗਤ।',

    selectState: 'ਰਾਜ / ਕੇਂਦਰ ਸ਼ਾਸਤ ਪ੍ਰਦੇਸ਼ ਚੁਣੋ',
    selectDistrict: 'ਜ਼ਿਲ੍ਹਾ ਚੁਣੋ',
    selectResidueType: 'ਰਹਿੰਦ-ਖੂੰਹਦ ਦੀ ਕਿਸਮ',
    buyerPurpose: 'ਖਰੀਦ ਦਾ ਮਕਸਦ',

    farmerAskingPrice: 'ਕਿਸਾਨ ਦੀ ਮੰਗੀ ਦਰ',
    buyerOfferedPrice: 'ਖਰੀਦਦਾਰ ਦੀ ਪੇਸ਼ਕਸ਼ ਦਰ',
    referencePrice: 'ਸਰਕਾਰੀ ਰੈਫਰੈਂਸ ਦਰ',
    deliveredCost: 'ਅੰਤਿਮ ਪਹੁੰਚ ਮੁੱਲ ਪ੍ਰਤੀ ਟਨ',
    transportCost: 'ਢੋਆ-ਢੁਆਈ ਖਰਚਾ',
    roadDistance: 'ਸੜਕੀ ਦੂਰੀ',
    vehicleTier: 'ਵਾਹਨ ਪ੍ਰੋਫਾਈਲ',
    requiredTrips: 'ਲੋੜੀਂਦੇ ਗੇੜੇ (ਟ੍ਰਿਪ)',
    farmGate: 'ਖੇਤ ਉੱਤੇ (ਫਾਰਮ-ਗੇਟ)',
    exWarehouse: 'ਗੋਦਾਮ (ਐਕਸ-ਵੇਅਰਹਾਊਸ)',
    delivered: 'ਪਹੁੰਚ (ਡਿਲੀਵਰਡ)',

    indicativeDisclaimer: 'ਅੰਦਾਜ਼ਨ ਢੋਆ-ਢੁਆਈ ਲਾਗਤ — ਅੰਤਿਮ ਰੇਟ ਟਰਾਂਸਪੋਰਟਰ ਨਾਲ ਤੈਅ ਕਰੋ।',
  },

  gu: {
    overview: 'વિહંગાવલોકન',
    marketIntelligence: 'માર્કેટ ઇન્ટેલિજન્સ',
    farmerPortal: 'ખેડૂત પોર્ટલ',
    buyerRequirements: 'ખરીદદાર જરૂરિયાતો',
    marketplace: 'માર્કેટપ્લેસ',
    dashboard: 'ડેશબોર્ડ',

    marketIntelligenceTitle: 'પાક અવશેષ માર્કેટ ઇન્ટેલિજન્સ અને પરિવહન ખર્ચ કેલ્ક્યુલેટર',
    marketIntelligenceSubtitle: 'રાજ્યવાર કૃષિ આંકડા, લાઇવ પુરવઠો-માંગ ખાતાવહી, ખરીદ-વેચાણ દરો અને આંતર-રાજ્ય પરિવહન ખર્ચ.',

    selectState: 'રાજ્ય / કેન્દ્રશાસિત પ્રદેશ પસંદ કરો',
    selectDistrict: 'જિલ્લો પસંદ કરો',
    selectResidueType: 'અવશેષનો પ્રકાર',
    buyerPurpose: 'ખરીદી હેતુ',

    farmerAskingPrice: 'ખેડૂતનો અપેક્ષિત દર',
    buyerOfferedPrice: 'ખરીદદારનો ઓફર દર',
    referencePrice: 'સંદર્ભ બજાર દર',
    deliveredCost: 'આખરી પહોંચ કિંમત પ્રતિ ટન',
    transportCost: 'પરિવહન ખર્ચ',
    roadDistance: 'માર્ગ અંતર',
    vehicleTier: 'વાહન પ્રોફાઇલ',
    requiredTrips: 'જરૂરી ફેરા (ટ્રિપ્સ)',
    farmGate: 'ફાર્મ-ગેટ (ખેતર પર)',
    exWarehouse: 'ગોડાઉન (એક્સ-વેરહાઉસ)',
    delivered: 'ડિલિવર્ડ (ફેક્ટરી પહોંચ)',

    indicativeDisclaimer: 'સૂચક પરિવહન અંદાજ — ટ્રાન્સપોર્ટર સાથે અંતિમ ભાવ નક્કી કરો.',
  },

  mr: {
    overview: 'अवलोकन',
    marketIntelligence: 'मार्केट इंटेलिजेंस',
    farmerPortal: 'शेतकरी पोर्टल',
    buyerRequirements: 'खरेदीदार आवश्यकता',
    marketplace: 'मार्केटप्लेस',
    dashboard: 'डॅशबोर्ड',

    marketIntelligenceTitle: 'पीक अवशेष मार्केट इंटेलिजेंस व वाहतूक खर्च कॅल्क्युलेटर',
    marketIntelligenceSubtitle: 'राज्यनिहाय कृषी आकडेवारी, थेट पुरवठा-मागणी खतावणी, खरेदी-विक्री दर आणि आंतरराज्य वाहतूक खर्च.',

    selectState: 'राज्य / केंद्रशासित प्रदेश निवडा',
    selectDistrict: 'जिल्हा निवडा',
    selectResidueType: 'अवशेषाचा प्रकार',
    buyerPurpose: 'खरेदीचा उद्देश',

    farmerAskingPrice: 'शेतकऱ्यांचा अपेक्षित दर',
    buyerOfferedPrice: 'खरेदीदारांचा प्रस्तावित दर',
    referencePrice: 'अधिकृत संदर्भ दर',
    deliveredCost: 'अंतिम पोहोच किंमत प्रति टन',
    transportCost: 'वाहतूक खर्च',
    roadDistance: 'रस्ता अंतर',
    vehicleTier: 'वाहन तपशील',
    requiredTrips: 'आवश्यक फेऱ्या (ट्रिप्स)',
    farmGate: 'शेत बांधावर (फार्म-गेट)',
    exWarehouse: 'गोदाम (एक्स-वेअरहाऊस)',
    delivered: 'पोहोच (डिलिव्हर्ड)',

    indicativeDisclaimer: 'सांकेतिक वाहतूक अंदाज — अंतिम दर ट्रान्सपोर्टरशी निश्चित करा.',
  },

  ta: {
    overview: 'கண்ணோட்டம்',
    marketIntelligence: 'சந்தை நுண்ணறிவு',
    farmerPortal: 'விவசாயி தளம்',
    buyerRequirements: 'வாங்குபவர் தேவைகள்',
    marketplace: 'சந்தை (மார்க்கெட்பிளேஸ்)',
    dashboard: 'டாஷ்போர்டு',

    marketIntelligenceTitle: 'பயிர் கழிவு சந்தை நுண்ணறிவு & போக்குவரத்து செலவு கால்குலேட்டர்',
    marketIntelligenceSubtitle: 'மாநில வேளாண் புள்ளிவிவரங்கள், நேரலை வழங்கல்-தேவை லெட்ஜர், வர்த்தக விலைகள் மற்றும் போக்குவரத்து செலவு.',

    selectState: 'மாநிலம் / யூனியன் பிரதேசம் தேர்ந்தெடுக்கவும்',
    selectDistrict: 'மாவட்டம் தேர்ந்தெடுக்கவும்',
    selectResidueType: 'கழிவு வகை',
    buyerPurpose: 'வாங்குவதன் நோக்கம்',

    farmerAskingPrice: 'விவசாயி எதிர்பார்க்கும் விலை',
    buyerOfferedPrice: 'வாங்குபவர் வழங்கும் விலை',
    referencePrice: 'அரசு வழிகாட்டி விலை',
    deliveredCost: 'இறுதி டெலிவரி விலை (டன்)',
    transportCost: 'போக்குவரத்து செலவு',
    roadDistance: 'சாலை பயண தூரம்',
    vehicleTier: 'வாகன வகை',
    requiredTrips: 'தேவையான பயணங்கள்',
    farmGate: 'பண்ணை வாசல் (ஃபார்ம்-கேட்)',
    exWarehouse: 'கிடங்கு (எக்ஸ்-வேர்ஹவுஸ்)',
    delivered: 'டெலிவரி (தொழிற்சாலை)',

    indicativeDisclaimer: 'குறிப்பீட்டு போக்குவரத்து மதிப்பீடு — இறுதி விலையை டிரான்ஸ்போர்ட்டரிடம் உறுதிப்படுத்தவும்.',
  },
};

