// מילון עברי בסיסי לבדיקת תקינות מילים
export const HEBREW_DICTIONARY = new Set([
  // מילים נפוצות
  "אבא",
  "אמא",
  "בית",
  "גן",
  "דלת",
  "הר",
  "ולד",
  "זמן",
  "חבר",
  "טוב",
  "יד",
  "כלב",
  "לב",
  "מים",
  "נר",
  "סוס",
  "עץ",
  "פה",
  "צבע",
  "קול",
  "ראש",
  "שם",
  "תמיד",

  // מילים קצרות
  "אב",
  "אח",
  "אם",
  "בן",
  "גם",
  "דם",
  "הם",
  "זה",
  "חם",
  "טל",
  "יש",
  "כן",
  "לא",
  "מה",
  "נו",
  "סל",
  "עד",
  "פן",
  "צל",
  "קר",
  "רק",
  "שם",
  "תן",

  // פעלים נפוצים
  "אכל",
  "בא",
  "גר",
  "דבר",
  "הלך",
  "ויצא",
  "זכר",
  "חשב",
  "טען",
  "ידע",
  "כתב",
  "למד",
  "מצא",
  "נתן",
  "סגר",
  "עבד",
  "פתח",
  "צחק",
  "קרא",
  "ראה",
  "שמע",
  "תפס",

  // שמות עצם נפוצים
  "אור",
  "בוקר",
  "גשם",
  "דרך",
  "היום",
  "ויום",
  "זכר",
  "חלום",
  "טעם",
  "ילד",
  "כוח",
  "לילה",
  "מקום",
  "נפש",
  "סיפור",
  "עולם",
  "פעם",
  "צהרים",
  "קיץ",
  "רגע",
  "שנה",
  "תקווה",

  // תארים
  "אדום",
  "בהיר",
  "גדול",
  "דק",
  "הרבה",
  "וחדש",
  "זקן",
  "חזק",
  "טהור",
  "יפה",
  "כחול",
  "לבן",
  "מתוק",
  "נקי",
  "סגול",
  "עמוק",
  "פשוט",
  "צעיר",
  "קטן",
  "רחב",
  "שחור",
  "תכלת",
])

const FINAL_FORMS: Record<string, string> = {
  ך: "כ",
  ם: "מ",
  ן: "נ",
  ף: "פ",
  ץ: "צ",
}

// נרמל סופיות: אם מילה מסתיימת באות רגילה שניתן להפוך לסופית – נבדוק גם את הגרסה עם אות סופית
export function normalizeWordVariants(word: string): string[] {
  if (!word) return []
  const variants = new Set<string>()
  variants.add(word)

  // הפוך אות סופית לאות רגילה לכל המופעים
  const regularized = word
    .split("")
    .map((ch) => FINAL_FORMS[ch as keyof typeof FINAL_FORMS] || ch)
    .join("")
  variants.add(regularized)

  // אם האות האחרונה ניתנת להמרה לצורת סופית, הוסף גם גרסה עם סופית
  const last = word[word.length - 1]
  const toFinal: Record<string, string> = { כ: "ך", מ: "ם", נ: "ן", פ: "ף", צ: "ץ" }
  if (toFinal[last]) {
    variants.add(word.slice(0, -1) + toFinal[last])
  }

  return Array.from(variants)
}

// בדיקה אם מילה קיימת במילון
export function isValidWord(word: string): boolean {
  if (word.length < 2) return false
  const variants = normalizeWordVariants(word)
  if (variants.some((w) => HEBREW_DICTIONARY.has(w))) return true
  // Fallback: accept any Hebrew letters (א-ת and finals)
  if (/^[א-תךםןףץ]+$/.test(word)) return true
  return false
}

// הוספת מילה למילון (למשחקים מותאמים אישית)
export function addWordToDictionary(word: string): void {
  if (word.length >= 2) {
    HEBREW_DICTIONARY.add(word)
  }
}
