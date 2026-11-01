// src/lib/welcomeStrings.js
// Strings for the welcome/onboarding screen. English + Hindi; every other
// language falls back to English. Kept out of i18nData.js to avoid merge
// conflicts with teammates editing that large file.

const EN = {
  brand: 'CropCycle Connect',
  skip: 'Skip',
  next: 'Next',
  slideOf: 'Go to slide',
  slide1Title: 'Put crop residue to better use',
  slide1Body: 'Instead of burning leftover straw, list it here and help reduce smoke in your community.',
  slide2Title: 'Find buyers near your farm',
  slide2Body: 'We match your residue with nearby bioenergy, paper and other businesses that can use it.',
  slide3Title: 'Turn a leftover into value',
  slide3Body: 'Share the quantity and pickup details. Compare interested buyers and arrange a sale.',
  photoPlaceholder: 'Photo placeholder',
  photoField: 'Field after harvest with crop residue ready for collection',
  photoMatching: 'A local buyer collecting crop residue from a farm',
  photoReuse: 'Crop residue being used to make useful products and energy',
  authTitle: 'Get started',
  tabRegister: 'Register',
  tabLogin: 'Log in',
  roleLabel: 'I am a',
  roleFarmer: 'Farmer',
  roleBuyer: 'Buyer (industry)',
  name: 'Full name',
  phone: 'Mobile number',
  district: 'District',
  createAccount: 'Create account',
  logIn: 'Log in',
  loginHint: 'Enter the mobile number you registered with.',
  guest: 'Explore without an account',
  errName: 'Enter your name',
  errPhone: 'Enter a valid 10-digit mobile number',
  errDistrict: 'Enter your district',
  errExists: 'This number already has an account. Use Log in instead.',
  errNotFound: 'No account found for this number. Register first.',
  errStorage: 'Could not save on this device. Check that browser storage is allowed.',
};

const HI = {
  skip: 'छोड़ें',
  next: 'आगे',
  slideOf: 'स्लाइड पर जाएं',
  slide1Title: 'फसल अवशेष का बेहतर उपयोग करें',
  slide1Body: 'बची हुई पराली जलाने के बजाय यहां दर्ज करें और अपने समुदाय में धुआं कम करने में मदद करें।',
  slide2Title: 'अपने खेत के पास खरीदार खोजें',
  slide2Body: 'हम आपके अवशेष को पास के बायोएनर्जी, कागज और अन्य उपयोग करने वाले व्यवसायों से मिलाते हैं।',
  slide3Title: 'बचे हुए अवशेष से मूल्य पाएं',
  slide3Body: 'मात्रा और उठाने की जानकारी दें। इच्छुक खरीदारों की तुलना करें और बिक्री तय करें।',
  photoPlaceholder: 'फोटो का स्थान',
  photoField: 'कटाई के बाद संग्रह के लिए तैयार फसल अवशेष वाला खेत',
  photoMatching: 'खेत से फसल अवशेष लेता स्थानीय खरीदार',
  photoReuse: 'उपयोगी उत्पाद और ऊर्जा बनाने में इस्तेमाल होता फसल अवशेष',
  authTitle: 'शुरू करें',
  tabRegister: 'पंजीकरण करें',
  tabLogin: 'लॉगिन करें',
  roleLabel: 'मैं हूँ',
  roleFarmer: 'किसान',
  roleBuyer: 'खरीदार (उद्योग)',
  name: 'पूरा नाम',
  phone: 'मोबाइल नंबर',
  district: 'जिला',
  createAccount: 'खाता बनाएं',
  logIn: 'लॉगिन करें',
  loginHint: 'जिस मोबाइल नंबर से पंजीकरण किया था, वही दर्ज करें।',
  guest: 'बिना खाते के देखें',
  errName: 'अपना नाम दर्ज करें',
  errPhone: 'सही 10 अंकों का मोबाइल नंबर दर्ज करें',
  errDistrict: 'अपना जिला दर्ज करें',
  errExists: 'इस नंबर पर खाता पहले से है। कृपया लॉगिन करें।',
  errNotFound: 'इस नंबर पर कोई खाता नहीं मिला। पहले पंजीकरण करें।',
  errStorage: 'इस डिवाइस पर सेव नहीं हो सका। ब्राउज़र स्टोरेज की अनुमति जांचें।',
};

const BY_LANGUAGE = { hi: HI };

export function getWelcomeText(language) {
  return { ...EN, ...(BY_LANGUAGE[language] || {}) };
}
