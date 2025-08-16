const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3002;

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

// In-memory dictionary storage
let hebrewDictionary = new Set();
let dictionaryArray = [];

/**
 * Load Hebrew dictionary from file into memory
 * Creates a basic Hebrew dictionary if file doesn't exist
 */
function loadDictionary() {
  const dictionaryPath = path.join(__dirname, 'hebrew-dictionary.txt');
  
  try {
    if (fs.existsSync(dictionaryPath)) {
      console.log('Loading dictionary from file...');
      const fileContent = fs.readFileSync(dictionaryPath, 'utf8');
      const words = fileContent.split('\n')
        .map(word => word.trim())
        .filter(word => word.length > 0 && /^[\u05D0-\u05EA\u05F0-\u05F2]+$/.test(word)); // Hebrew letters only
      
      hebrewDictionary = new Set(words);
      dictionaryArray = Array.from(hebrewDictionary);
      console.log(`Loaded ${dictionaryArray.length} Hebrew words from dictionary file`);
    } else {
      console.log('Dictionary file not found, creating basic Hebrew dictionary...');
      createBasicDictionary();
    }
  } catch (error) {
    console.error('Error loading dictionary:', error);
    createBasicDictionary();
  }
}

/**
 * Create a basic Hebrew dictionary with common words for testing
 */
function createBasicDictionary() {
  const basicWords = [
    // Common Hebrew words for testing
    'אב', 'אם', 'בן', 'בת', 'איש', 'אישה', 'ילד', 'ילדה',
    'בית', 'דלת', 'חלון', 'שולחן', 'כיסא', 'מיטה', 'ספר', 'עט',
    'מים', 'לחם', 'חלב', 'ביצה', 'בשר', 'דג', 'פרי', 'ירק',
    'שמש', 'ירח', 'כוכב', 'עץ', 'פרח', 'עלה', 'שורש', 'ענף',
    'ראש', 'עין', 'אף', 'פה', 'אוזן', 'יד', 'רגל', 'לב',
    'אדום', 'כחול', 'ירוק', 'צהוב', 'שחור', 'לבן', 'אפור', 'חום',
    'גדול', 'קטן', 'ארוך', 'קצר', 'רחב', 'צר', 'גבוה', 'נמוך',
    'טוב', 'רע', 'יפה', 'מכוער', 'חכם', 'טיפש', 'חזק', 'חלש',
    'אהבה', 'שנאה', 'שמחה', 'עצב', 'פחד', 'כעס', 'תקוה', 'חלום',
    'זמן', 'יום', 'לילה', 'בוקר', 'ערב', 'שעה', 'דקה', 'שנייה',
    'שנה', 'חודש', 'שבוע', 'אתמול', 'היום', 'מחר', 'עבר', 'עתיד',
    'מקום', 'כאן', 'שם', 'פה', 'צפון', 'דרום', 'מזרח', 'מערב',
    'עיר', 'כפר', 'רחוב', 'כביש', 'גשר', 'נהר', 'ים', 'הר',
    'בית', 'בתים', 'דבר', 'דברים', 'איש', 'אנשים', 'אישה', 'נשים',
    'ילד', 'ילדים', 'ספר', 'ספרים', 'שולחן', 'שולחנות',
    // Test words for game validation
    'דג', 'גד', 'בד', 'דב', 'בג', 'גב',
    'אל', 'לא', 'מן', 'נם', 'על', 'לע',
    'כל', 'לכ', 'בכ', 'כב', 'אכ', 'כא',
    'דופן', 'נפוד', 'פנד', 'דנף', 'פדן', 'נדף',
    'שלום', 'מולש', 'לומש', 'משול', 'שומל', 'מושל'
  ];

  hebrewDictionary = new Set(basicWords);
  dictionaryArray = Array.from(hebrewDictionary);
  
  // Create the dictionary file for future use
  const dictionaryPath = path.join(__dirname, 'hebrew-dictionary.txt');
  fs.writeFileSync(dictionaryPath, basicWords.join('\n'), 'utf8');
  
  console.log(`Created basic Hebrew dictionary with ${dictionaryArray.length} words`);
}

// Define the character mappings at the top level
const finalToRegular = {
  'ך': 'כ',
  'ם': 'מ', 
  'ן': 'נ',
  'ף': 'פ',
  'ץ': 'צ'
};

const regularToFinal = {
  'כ': 'ך',
  'מ': 'ם',
  'נ': 'ן', 
  'פ': 'ף',
  'צ': 'ץ'
};

/**
 * Normalize Hebrew word by handling final forms
 * Converts final letters to their regular forms for lookup
 */
function normalizeHebrewWord(word) {
  return word.split('').map(char => finalToRegular[char] || char).join('');
}

/**
 * Check if a Hebrew word is valid
 * Handles both regular and final letter forms
 */
function isValidHebrewWord(word) {
  if (!word || word.length < 2) return false;
  
  // Check if word contains only Hebrew letters
  const hebrewRegex = /^[\u05D0-\u05EA\u05F0-\u05F2]+$/;
  if (!hebrewRegex.test(word)) return false;
  
  // Check exact match first
  if (hebrewDictionary.has(word)) return true;
  
  // Check normalized version (final forms converted to regular)
  const normalized = normalizeHebrewWord(word);
  if (hebrewDictionary.has(normalized)) return true;
  
  // Check if any word in dictionary matches when we convert regular to final
  
  // Try variations with final forms at the end
  if (word.length >= 2) {
    const lastChar = word[word.length - 1];
    const beforeLast = word.slice(0, -1);
    
    // If last char is regular, try with final form
    if (regularToFinal[lastChar]) {
      const withFinal = beforeLast + regularToFinal[lastChar];
      if (hebrewDictionary.has(withFinal)) return true;
    }
    
    // If last char is final, try with regular form
    if (finalToRegular[lastChar]) {
      const withRegular = beforeLast + finalToRegular[lastChar];
      if (hebrewDictionary.has(withRegular)) return true;
    }
  }
  
  return false;
}

// Routes

/**
 * GET /dictionary - Return full dictionary as JSON array
 */
app.get('/dictionary', (req, res) => {
  res.json({
    count: dictionaryArray.length,
    words: dictionaryArray
  });
});

/**
 * GET /dictionary/search?q=WORD - Check if word exists in dictionary
 * Returns: { "word": "<WORD>", "valid": true/false }
 */
app.get('/dictionary/search', (req, res) => {
  const word = req.query.q;
  
  if (!word) {
    return res.status(400).json({
      error: 'Missing query parameter "q"',
      example: '/dictionary/search?q=שלום'
    });
  }
  
  // Decode URI component to handle Hebrew characters properly
  let decodedWord;
  try {
    decodedWord = decodeURIComponent(word);
  } catch (e) {
    decodedWord = word;
  }
  
  console.log(`Checking word: "${decodedWord}" (original: "${word}")`);
  const isValid = isValidHebrewWord(decodedWord);
  
  res.json({
    word: decodedWord,
    valid: isValid
  });
});

/**
 * POST /dictionary/validate-words - Validate multiple words at once
 * Body: { "words": ["word1", "word2", ...] }
 * Returns: { "results": [{"word": "word1", "valid": true}, ...] }
 */
app.post('/dictionary/validate-words', (req, res) => {
  const { words } = req.body;
  
  if (!Array.isArray(words)) {
    return res.status(400).json({
      error: 'Request body must contain "words" array',
      example: '{ "words": ["שלום", "עולם"] }'
    });
  }
  
  const results = words.map(word => ({
    word: word,
    valid: isValidHebrewWord(word)
  }));
  
  res.json({
    results: results,
    allValid: results.every(r => r.valid)
  });
});

/**
 * GET /dictionary/stats - Get dictionary statistics
 */
app.get('/dictionary/stats', (req, res) => {
  res.json({
    totalWords: dictionaryArray.length,
    sampleWords: dictionaryArray.slice(0, 10),
    serverStatus: 'running'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    availableEndpoints: [
      'GET /dictionary',
      'GET /dictionary/search?q=WORD', 
      'POST /dictionary/validate-words',
      'GET /dictionary/stats'
    ]
  });
});

// Load dictionary and start server
loadDictionary();

app.listen(PORT, () => {
  console.log(`\n🔤 Hebrew Dictionary API Server running on port ${PORT}`);
  console.log(`📚 Dictionary loaded with ${dictionaryArray.length} words`);
  console.log(`\n📡 Available endpoints:`);
  console.log(`   GET  http://localhost:${PORT}/dictionary`);
  console.log(`   GET  http://localhost:${PORT}/dictionary/search?q=שלום`);
  console.log(`   POST http://localhost:${PORT}/dictionary/validate-words`);
  console.log(`   GET  http://localhost:${PORT}/dictionary/stats`);
  console.log(`\n✅ Server ready for Hebrew word validation!`);
});

module.exports = app;
