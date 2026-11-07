/**
 * FraudsFilter - scoring.js
 * Detection signals collection, word-boundary keyword matching,
 * multi-language pattern checks, confidence level calculation, and risk assessment.
 */

import { getCategories, getRules } from "./rules.js";
import { extractUrls, analyzeUrl } from "./url.js";

/**
 * Escape special regex characters in a search term.
 * @param {string} string
 * @returns {string}
 */
export function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Check if a keyword or phrase exists in text with proper word boundaries.
 * Uses Unicode property escapes so it works reliably across English, Hinglish, and Bengali script.
 * 
 * @param {string} text - Message text
 * @param {string} keyword - Keyword or phrase to look for
 * @returns {boolean}
 */
export function matchWithWordBoundary(text, keyword) {
    if (!text || !keyword) return false;
    const trimmed = keyword.trim();
    if (!trimmed) return false;

    // Use Unicode negative lookbehind and lookahead to prevent matching inside other words
    // e.g., 'urgent' will NOT match 'detergent', 'pin' will NOT match 'spinning'
    const escaped = escapeRegex(trimmed);
    const regex = new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, "iu");
    return regex.test(text);
}

/**
 * Calculate the confidence level and explanatory reason based on detected signals.
 * 
 * @param {number} signalCount - Total number of detected warning signals
 * @param {Array<string>} categories - Detected scam categories
 * @param {Array<string>} indicators - Detected indicator names
 * @param {boolean} hasDangerousCombo - Whether a dangerous combination was triggered
 * @param {string} lang - Language code
 * @returns {object} { level: 'LOW'|'MEDIUM'|'HIGH', label: string, reason: string }
 */
export function calculateConfidence(signalCount, categories = [], indicators = [], hasDangerousCombo = false, lang = "en") {
    const rules = getRules();
    const t = (rules.translations && rules.translations[lang]) || rules.translations?.en || {};

    if (signalCount === 0) {
        return {
            level: "LOW",
            label: t.confidence_low || "Low Confidence",
            reason: lang === "hi"
                ? "कम आत्मविश्वास: कोई संदिग्ध संकेतक नहीं मिला।"
                : lang === "bn"
                ? "কম আত্মবিশ্বাস: কোনো সন্দেহজনক সংকেত পাওয়া যায়নি।"
                : "Low confidence: No suspicious indicators or warning patterns detected."
        };
    }

    if (signalCount === 1 && !hasDangerousCombo) {
        const first = indicators[0] || categories[0] || "warning sign";
        return {
            level: "LOW",
            label: t.confidence_low || "Low Confidence",
            reason: lang === "hi"
                ? `कम आत्मविश्वास: केवल 1 संदिग्ध संकेत मिला ('${first}')। यह एक सामान्य संदेश भी हो सकता है।`
                : lang === "bn"
                ? `কম আত্মবিশ্বাস: শুধুমাত্র ১টি বিচ্ছিন্ন সংকেত পাওয়া গেছে ('${first}')। এটি একটি সাধারণ বার্তাও হতে পারে।`
                : `Low confidence: only 1 isolated suspicious signal detected ('${first}'). This may be a legitimate message.`
        };
    }

    if (signalCount === 2 && !hasDangerousCombo) {
        const catList = categories.join(", ") || indicators.join(", ");
        return {
            level: "MEDIUM",
            label: t.confidence_medium || "Medium Confidence",
            reason: lang === "hi"
                ? `मध्यम आत्मविश्वास: 2 अलग-अलग चेतावनी संकेत मिले (${catList})। आगे जांच करने की सलाह दी जाती है।`
                : lang === "bn"
                ? `মাঝারি আত্মবিশ্বাস: ২টি সতর্কবার্তা পাওয়া গেছে (${catList})। স্বাধীন যাচাইকরণ বাঞ্ছনীয়।`
                : `Medium confidence: 2 distinct warning signals detected (${catList}). Independent verification is recommended.`
        };
    }

    // High confidence: 3 or more signals, or a dangerous combination
    const catList = categories.join(", ") || indicators.join(", ");
    return {
        level: "HIGH",
        label: t.confidence_high || "High Confidence",
        reason: lang === "hi"
            ? `उच्च आत्मविश्वास: एक साथ कई मजबूत चेतावनी संकेत (${catList}) पाए गए, जो ज्ञात धोखाधड़ी पैटर्न से मेल खाते हैं।`
            : lang === "bn"
            ? `উচ্চ আত্মবিশ্বাস: একাধিক শক্তিশালী সতর্কবার্তা (${catList}) একসাথে পাওয়া গেছে, যা পরিচিত প্রতারণা প্যাটার্নের সাথে মিলে যায়।`
            : `High confidence: multiple strong warning signs (${catList}) detected together in a known scam pattern.`
    };
}

/**
 * Analyze full message content against categories, URL analysis, and combination heuristics.
 * 
 * @param {string} text - Message or URL to analyze
 * @param {string} lang - Language code ('en', 'hi', or 'bn')
 * @returns {object}
 */
export function analyzeMessage(text, lang = "en") {
    if (!text || typeof text !== "string") {
        return {
            score: 0,
            risk: "LOW",
            confidence: calculateConfidence(0, [], [], false, lang),
            categories: [],
            indicators: [],
            reasons: [],
            matchedKeywords: [],
            urls: []
        };
    }

    const categories = new Set();
    const indicators = new Set();
    const reasons = [];
    const matchedKeywords = [];
    let rawScore = 0;

    const patternCategories = getCategories();

    // 1. Check keyword and phrase patterns across all language definitions
    patternCategories.forEach(cat => {
        const matchedInCat = [];

        // Check English words
        if (Array.isArray(cat.words?.en)) {
            cat.words.en.forEach(word => {
                if (matchWithWordBoundary(text, word)) {
                    matchedInCat.push(word);
                    matchedKeywords.push({ word, category: cat.name });
                }
            });
        }

        // Check Hindi / Hinglish words
        if (Array.isArray(cat.words?.hi)) {
            cat.words.hi.forEach(word => {
                if (matchWithWordBoundary(text, word)) {
                    matchedInCat.push(word);
                    matchedKeywords.push({ word, category: cat.name });
                }
            });
        }

        // Check Bengali words
        if (Array.isArray(cat.words?.bn)) {
            cat.words.bn.forEach(word => {
                if (matchWithWordBoundary(text, word)) {
                    matchedInCat.push(word);
                    matchedKeywords.push({ word, category: cat.name });
                }
            });
        }

        if (matchedInCat.length > 0) {
            categories.add(cat.name);
            indicators.add(cat.name);

            // Calculate contribution based on base points and matches
            const pointsToAdd = Math.min(cat.points || 12, matchedInCat.length * 6 + 6);
            rawScore += pointsToAdd;

            const localizedReason = (cat.reason && cat.reason[lang]) || cat.reason?.en || "Detected suspicious pattern.";
            reasons.push(`${cat.name}: ${localizedReason}`);
        }
    });

    // 2. Extract and analyze any URLs in the text
    const urls = extractUrls(text);
    let suspiciousUrlsCount = 0;

    urls.forEach(url => {
        const urlRes = analyzeUrl(url, null, lang);

        if (urlRes.isSuspicious) {
            suspiciousUrlsCount++;
            rawScore += urlRes.score;

            urlRes.indicators.forEach(item => indicators.add(item));
            urlRes.reasons.forEach(r => reasons.push(r));

            matchedKeywords.push({ word: url, category: "Suspicious Link" });
        }
    });

    // 3. Evaluate dangerous multi-category combinations (cross-signal correlation)
    let hasDangerousCombo = false;

    // Urgency + Credential Request (Highest danger)
    if (categories.has("Urgency") && categories.has("Credential Request")) {
        hasDangerousCombo = true;
        rawScore += 15;
        reasons.push(
            lang === "hi"
                ? "संवेदनशील जानकारी (ओटीपी/पिन) मांगने के साथ जल्दबाजी का दबाव एक क्लासिक धोखाधड़ी संकेत है।"
                : lang === "bn"
                ? "সংবেদনশীল তথ্য (ওটিপি/পিন) চাওয়ার সাথে জরুরি তাড়ার সংমিশ্রণ একটি মারাত্মক প্রতারণার লক্ষণ।"
                : "Urgency combined with requests for sensitive credentials is a very strong fraud indicator."
        );
    }

    // Threat + Urgency (Electricity bill / Police threats)
    if (categories.has("Threat / Fear") && categories.has("Urgency")) {
        hasDangerousCombo = true;
        rawScore += 12;
        reasons.push(
            lang === "hi"
                ? "कानूनी कार्रवाई या बिजली कटने की धमकी के साथ समय सीमा देना डराने वाला स्कैम पैटर्न है।"
                : lang === "bn"
                ? "আইনি ব্যবস্থা বা বিদ্যুৎ সংযোগ কাটার হুমকির সাথে সময়সীমা নির্ধারণ একটি সাধারণ প্রতারণার ফাঁদ।"
                : "Threats of immediate disconnection or legal action are typical pressure tactics used in utility/police scams."
        );
    }

    // Payment Request + Fake Reward (Advance fee lottery scams)
    if (categories.has("Payment Request & UPI Fraud") && categories.has("Fake Reward / Lottery")) {
        hasDangerousCombo = true;
        rawScore += 15;
        reasons.push(
            lang === "hi"
                ? "इनाम देने के बहाने कोई भी शुल्क मांगना अग्रिम शुल्क धोखाधड़ी (Advance-fee fraud) का स्पष्ट संकेत है।"
                : lang === "bn"
                ? "পুরস্কার দেওয়ার নামে অগ্রিম ফি চাওয়া সুস্পষ্ট অগ্রিম-ফি প্রতারণার লক্ষণ।"
                : "Demanding fees or deposits to claim a prize is a hallmark of advance-fee lottery scams."
        );
    }

    // Authority Impersonation + Threat / Fear (Digital arrest / Courier scams)
    if (categories.has("Authority & Courier Impersonation") && categories.has("Threat / Fear")) {
        hasDangerousCombo = true;
        rawScore += 18;
        reasons.push(
            lang === "hi"
                ? "कानूनी कार्रवाई या गिरफ्तारी की धमकी के साथ अधिकारियों (पुलिस/कस्टम्स) का प्रतिरूपण गंभीर साइबर अपराध का संकेत है।"
                : lang === "bn"
                ? "আইনি ব্যবস্থা বা গ্রেপ্তারের হুমকির সাথে কর্মকর্তার ছদ্মবেশ ধারণ ডিজিটাল অ্যারেস্ট বা কুরিয়ার প্রতারণার লক্ষণ।"
                : "Impersonating law enforcement, customs, or authorities with threats of arrest or legal action is characteristic of digital arrest and parcel courier scams."
        );
    }

    // Authority Impersonation + Payment or Credential Request
    if (categories.has("Authority & Courier Impersonation") && (categories.has("Credential Request") || categories.has("Payment Request & UPI Fraud"))) {
        hasDangerousCombo = true;
        rawScore += 15;
        reasons.push(
            lang === "hi"
                ? "अधिकारियों (पुलिस/कस्टम्स) के नाम पर पैसे या क्रेडेंशियल मांगना एक गंभीर प्रतिरूपण धोखाधड़ी है।"
                : lang === "bn"
                ? "কর্মকর্তার (পুলিশ/কাস্টমস) ছদ্মবেশে টাকা বা পাসওয়ার্ড চাওয়া মারাত্মক জালিয়াতির প্রমাণ।"
                : "Authority impersonation coupled with financial or credential demands is typical of courier or digital arrest fraud."
        );
    }

    // 3 or more distinct scam categories in a single message
    if (categories.size >= 3) {
        hasDangerousCombo = true;
    }

    // Cap the score at 100
    const finalScore = Math.min(Math.round(rawScore), 100);

    // Determine Risk level
    let risk = "LOW";
    if (finalScore >= 55 || hasDangerousCombo || categories.size >= 3) {
        risk = "HIGH";
    } else if (finalScore >= 28 || indicators.size >= 2 || categories.size >= 2) {
        risk = "MEDIUM";
    }

    // Total distinct signals
    const totalSignals = categories.size + suspiciousUrlsCount + (hasDangerousCombo ? 1 : 0);

    // Calculate confidence level and plain-English explanation
    const confidence = calculateConfidence(
        totalSignals,
        Array.from(categories),
        Array.from(indicators),
        hasDangerousCombo,
        lang
    );

    return {
        score: finalScore,
        risk,
        confidence,
        categories: Array.from(categories),
        indicators: Array.from(indicators),
        reasons: Array.from(new Set(reasons)),
        matchedKeywords,
        urls
    };
}

/**
 * Return actionable safety recommendations according to risk and confidence.
 * 
 * @param {object} result - Output from analyzeMessage
 * @param {string} lang - Language code ('en', 'hi', 'bn')
 * @returns {Array<string>}
 */
export function getRecommendations(result, lang = "en") {
    if (result.risk === "HIGH") {
        if (lang === "hi") {
            return [
                "संदेश में दिए गए किसी भी लिंक पर क्लिक न करें और न ही कोई अज्ञात फ़ाइल डाउनलोड करें।",
                "अपना ओटीपी (OTP), पासवर्ड, यूपीआई पिन (PIN), या सीवीवी कभी किसी से साझा न करें। बैंक या पुलिस इसे कभी नहीं मांगते।",
                "पैसे प्राप्त करने के लिए कभी भी अपना यूपीआई पिन दर्ज न करें। पिन केवल पैसे भेजने के लिए होता है।",
                "संबंधित बैंक या संस्थान की आधिकारिक वेबसाइट अथवा हेल्पलाइन नंबर से स्वतंत्र रूप से पुष्टि करें।",
                "यदि आपने गलती से कोई जानकारी साझा की है, तो तुरंत अपने बैंक को सूचित करें और साइबर क्राइम (1930) पर रिपोर्ट करें।"
            ];
        }
        if (lang === "bn") {
            return [
                "সন্দেহজনক লিঙ্কে ক্লিক করবেন না বা অপ্রত্যাশিত কোনো ফাইল ডাউনলোড করবেন না।",
                "আপনার ওটিপি (OTP), পাসওয়ার্ড, ইউপিআই পিন (PIN), বা সিভিভি কখনও কারো সাথে শেয়ার করবেন না।",
                "টাকা পাওয়ার জন্য কখনও ইউপিআই পিন প্রবেশ করাবেন না। পিন শুধুমাত্র টাকা পাঠানোর জন্য ব্যবহৃত হয়।",
                "প্রতিষ্ঠানটির অফিসিয়াল ওয়েবসাইট বা কাস্টমার কেয়ার নম্বরের মাধ্যমে স্বাধীনভাবে যাচাই করুন।",
                "আপনি ইতিমধ্যে সংবেদনশীল তথ্য শেয়ার করে থাকলে, অবিলম্বে আপনার ব্যাঙ্কে এবং সাইবার হেল্পলাইনে (1930) যোগাযোগ করুন।"
            ];
        }
        return [
            "Do not click suspicious links or download unexpected attachments.",
            "Never share OTPs, passwords, UPI PINs, or CVVs. Legitimate banks and police officers never ask for them.",
            "Remember: You NEVER need to enter a UPI PIN to receive money.",
            "Verify the request through the organization's official website, app, or verified helpline number.",
            "If you have already shared credentials, contact your bank immediately and report to cyber crime authorities (1930 in India)."
        ];
    }

    if (result.risk === "MEDIUM") {
        if (lang === "hi") {
            return [
                "कोई भी कदम उठाने से पहले प्रेषक (Sender) की पहचान की सावधानीपूर्वक पुष्टि करें।",
                "संदेश में आए लिंक के बजाय आधिकारिक ऐप या वेबसाइट का सीधे उपयोग करें।",
                "जब तक अनुरोध की स्वतंत्र रूप से पुष्टि न हो जाए, व्यक्तिगत विवरण न दें।",
                "सरकारी योजनाओं या नौकरियों के दावों को आधिकारिक सरकारी पोर्टल पर ही जांचें।"
            ];
        }
        if (lang === "bn") {
            return [
                "কোনো পদক্ষেপ নেওয়ার আগে প্রেরকের পরিচয় সাবধানে যাচাই করুন।",
                "বার্তায় থাকা লিঙ্কের পরিবর্তে অফিসিয়াল অ্যাপ বা ওয়েবসাইটে সরাসরি যান।",
                "অনুরোধটি স্বাধীনভাবে যাচাই না হওয়া পর্যন্ত ব্যক্তিগত তথ্য দেবেন না।",
                "সরকারি প্রকল্প বা চাকরির প্রস্তাব অফিসিয়াল সরকারি পোর্টালে যাচাই করুন।"
            ];
        }
        return [
            "Carefully verify the sender's identity before taking any action.",
            "Avoid clicking links in the message; navigate directly to official websites or apps.",
            "Do not provide personal or financial information until independently confirmed.",
            "Verify government scheme or job claims on official departmental websites."
        ];
    }

    // Low risk
    if (lang === "hi") {
        return [
            "इस प्रोटोटाइप द्वारा कोई बड़ा धोखाधड़ी संकेतक नहीं पाया गया।",
            "फिर भी अप्रत्याशित वित्तीय अनुरोधों या अज्ञात लिंक को स्वतंत्र रूप से सत्यापित करें।",
            "अज्ञात व्यक्तियों के साथ कभी भी पासवर्ड, ओटीपी या पिन साझा न करें।"
        ];
    }
    if (lang === "bn") {
        return [
            "এই প্রোটোটাইপ দ্বারা কোনো বড় প্রতারণার সতর্কতা চিহ্নিত করা যায়নি।",
            "তবুও অপ্রত্যাশিত যেকোনো অনুরোধ সতর্কতার সাথে স্বাধীনভাবে যাচাই করুন।",
            "অপরিচিত ব্যক্তির সাথে কখনই পাসওয়ার্ড, ওটিপি বা পিন শেয়ার করবেন না।"
        ];
    }
    return [
        "No major scam indicators were detected by this prototype.",
        "Still verify unexpected requests independently before taking action.",
        "Never share passwords, OTPs, or PINs with anyone who contacts you unexpectedly."
    ];
}

export default {
    escapeRegex,
    matchWithWordBoundary,
    calculateConfidence,
    analyzeMessage,
    getRecommendations
};
