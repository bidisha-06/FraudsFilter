/**
 * FraudsFilter - url.js
 * Reliable URL extraction, parsing, and domain-based security analysis.
 */

import { getUrlRules } from "./rules.js";

/**
 * Extract URLs reliably from a given text string.
 * Handles http://, https://, www., and naked domains with known TLDs or shorteners.
 * Strips trailing sentence punctuation safely.
 * 
 * @param {string} text
 * @returns {Array<string>}
 */
export function extractUrls(text) {
    if (!text || typeof text !== "string") {
        return [];
    }

    // Pattern for URLs with protocol, www., known shorteners, or naked domains with suspicious TLDs
    const urlPattern = /(?:https?:\/\/|www\.)[^\s<>"'()]+|\b(?:bit\.ly|tinyurl\.com|t\.co|cutt\.ly|is\.gd|rb\.gy|shorturl\.at)(?:\/[^\s<>"'()]*)?|\b[a-zA-Z0-9-]+\.(?:xyz|top|work|club|buzz|site|online|live|tech|app|click)(?:\/[^\s<>"'()]*)?/gi;

    const matches = text.match(urlPattern) || [];

    // Clean trailing punctuation that is not part of the URL (e.g., periods, commas, closing brackets)
    const cleanedUrls = matches.map(url => {
        let cleaned = url.trim();
        // Remove trailing punctuation often captured from surrounding sentence structure
        cleaned = cleaned.replace(/[.,;:!?)]+$/, "");
        return cleaned;
    }).filter(url => url.length > 3);

    // Deduplicate
    return Array.from(new Set(cleanedUrls));
}

/**
 * Helper to check if a hostname belongs to a known legitimate domain.
 * @param {string} hostname
 * @param {Array<string>} legitDomains
 * @returns {boolean}
 */
export function isLegitimateDomain(hostname, legitDomains = []) {
    if (!hostname) return false;
    const lower = hostname.toLowerCase();
    return legitDomains.some(legit => {
        const lowerLegit = legit.toLowerCase();
        return lower === lowerLegit || lower.endsWith("." + lowerLegit);
    });
}

/**
 * Safely parse a URL string, ensuring protocol exists.
 * @param {string} url
 * @returns {URL|null}
 */
export function safelyParseUrl(url) {
    if (!url || typeof url !== "string") return null;
    let normalized = url.trim();
    if (!/^https?:\/\//i.test(normalized)) {
        normalized = "http://" + normalized;
    }
    try {
        return new URL(normalized);
    } catch {
        return null;
    }
}

/**
 * Analyze a URL using centralized domain rules, structural checks, and keyword analysis.
 * 
 * @param {string} url
 * @param {object} customRules - Optional custom URL rules object
 * @param {string} lang - Language code ('en', 'hi', 'bn')
 * @returns {object}
 */
export function analyzeUrl(url, customRules = null, lang = "en") {
    const rules = customRules || getUrlRules();
    const suspiciousWords = rules.suspicious_words || [];
    const combinations = rules.combinations || [];
    const lookalikeTerms = rules.lookalike_domains || [];
    const suspiciousTlds = rules.suspicious_tlds || [];
    const shorteners = rules.url_shorteners || [];
    const legitDomains = rules.legitimate_domains || [];

    let score = 0;
    const reasons = [];
    const indicators = [];

    const parsed = safelyParseUrl(url);

    if (!parsed) {
        return {
            score: 25,
            indicators: ["Malformed URL"],
            reasons: [
                lang === "hi"
                    ? "यूआरएल को सामान्य रूप से पार्स नहीं किया जा सका।"
                    : lang === "bn"
                    ? "ইউআরএল স্বাভাবিকভাবে পার্স করা যায়নি।"
                    : "The URL could not be parsed normally."
            ],
            hostname: "",
            isSuspicious: true
        };
    }

    const lowerUrl = url.toLowerCase();
    const hostname = parsed.hostname.toLowerCase();

    // 1. Check if it is an officially recognized legitimate domain
    const isLegit = isLegitimateDomain(hostname, legitDomains);

    // If it's a known legitimate domain, we should not flag routine path words as phishing
    if (isLegit) {
        // Legitimate domain; still check if insecure HTTP is used for sensitive actions
        if (parsed.protocol === "http:") {
            score += 5;
            indicators.push("Insecure HTTP link");
            reasons.push("The legitimate domain link uses unencrypted HTTP.");
        }
        return {
            score: Math.min(score, 10),
            indicators,
            reasons,
            hostname,
            isSuspicious: false,
            isLegitimate: true
        };
    }

    // 2. Check for IP address as hostname (e.g. http://192.168.1.1/login)
    const isIpAddress = /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname) || /^\[[0-9a-fA-F:]+\]$/.test(hostname);
    if (isIpAddress) {
        score += 25;
        indicators.push("IP address URL");
        reasons.push(
            lang === "hi"
                ? "लिंक में डोमेन नाम के बजाय एक सीधा आईपी एड्रेस का उपयोग किया गया है।"
                : lang === "bn"
                ? "লিঙ্কটি ডোমেন নামের পরিবর্তে একটি সরাসরি আইপি ঠিকানা ব্যবহার করে।"
                : "The link uses a direct IP address instead of a standard domain name."
        );
    }

    // 3. Deceptive subdomain spoofing (e.g. sbi.co.in.fake-portal.com or hdfcbank.xyz)
    const brandNames = ["sbi", "onlinesbi", "hdfc", "icici", "axis", "paytm", "phonepe", "gpay", "paypal", "amazon", "google"];
    const spoofedBrand = brandNames.find(b => {
        // Look for brand in subdomain or as part of deceptive domain
        return hostname.includes(b) && !isLegitimateDomain(hostname, legitDomains);
    });

    if (spoofedBrand && !isLegit) {
        score += 28;
        indicators.push("Brand spoofing domain");
        reasons.push(
            lang === "hi"
                ? `डोमेन में एक बैंक या ब्रांड नाम ('${spoofedBrand}') का अनधिकृत उपयोग किया गया प्रतीत होता है।`
                : lang === "bn"
                ? `ডোমেনটিতে একটি ব্যাঙ্ক বা ব্র্যান্ড নাম ('${spoofedBrand}') এর অননুমোদিত ব্যবহার দেখা যাচ্ছে।`
                : `The domain name appears to mimic a trusted brand or bank ('${spoofedBrand}').`
        );
    }

    // 4. Look-alike / Typosquatting domains
    const matchedLookalike = lookalikeTerms.find(term => hostname.includes(term.toLowerCase()));
    if (matchedLookalike) {
        score += 30;
        indicators.push("Look-alike domain");
        reasons.push(
            lang === "hi"
                ? `डोमेन में भ्रामक वर्तनी (Look-alike '${matchedLookalike}') का प्रयोग हुआ है।`
                : lang === "bn"
                ? `ডোমেনটিতে বিভ্রান্তিকর বানান (Look-alike '${matchedLookalike}') ব্যবহার করা হয়েছে।`
                : `The domain contains a look-alike spelling pattern ('${matchedLookalike}').`
        );
    }

    // 5. URL Shorteners
    const isShortener = shorteners.some(s => hostname === s.toLowerCase() || hostname.endsWith("." + s.toLowerCase()));
    if (isShortener) {
        score += 15;
        indicators.push("URL shortener");
        reasons.push(
            lang === "hi"
                ? "लिंक एक यूआरएल शॉर्टनर का उपयोग करता है, जो अंतिम गंतव्य को छुपाता है।"
                : lang === "bn"
                ? "লিঙ্কটি একটি ইউআরএল শর্টনার ব্যবহার করে, যা চূড়ান্ত গন্তব্য গোপন রাখে।"
                : "The link uses a URL shortener which disguises the final destination."
        );
    }

    // 6. High-risk / Suspicious TLDs
    const matchedTld = suspiciousTlds.find(tld => hostname.endsWith(tld.toLowerCase()));
    if (matchedTld) {
        score += 15;
        indicators.push("Suspicious domain extension");
        reasons.push(
            lang === "hi"
                ? `डोमेन में उच्च जोखिम वाला एक्सटेंशन ('${matchedTld}') उपयोग किया गया है।`
                : lang === "bn"
                ? `ডোমেনটিতে উচ্চ ঝুঁকিপূর্ণ এক্সটেনশন ('${matchedTld}') ব্যবহার করা হয়েছে।`
                : `The domain uses an extension ('${matchedTld}') commonly associated with disposable scam sites.`
        );
    }

    // 7. Excessive hyphens in hostname (e.g. sbi-kyc-verify-portal.com)
    const hyphenCount = (hostname.match(/-/g) || []).length;
    if (hyphenCount >= 3) {
        score += 12;
        indicators.push("Hyphen-stuffed domain");
        reasons.push("The domain name contains multiple hyphens, often used to simulate official service names.");
    }

    // 8. @ symbol in URL (credentials in URL spoofing)
    if (url.includes("@")) {
        score += 20;
        indicators.push("@ symbol in URL");
        reasons.push("The URL contains an '@' symbol, which can disguise the actual destination.");
    }

    // 9. HTTP instead of HTTPS
    if (parsed.protocol === "http:") {
        score += 10;
        indicators.push("Insecure HTTP link");
        reasons.push("The link uses unencrypted HTTP instead of secure HTTPS.");
    }

    // 10. Unusually long URL
    if (url.length > 100) {
        score += 8;
        indicators.push("Very long URL");
        reasons.push("The URL is unusually long, which can obscure suspicious parameters.");
    }

    // 11. Centralized Suspicious Keywords
    const foundKeywords = suspiciousWords.filter(word => lowerUrl.includes(word.toLowerCase()));
    if (foundKeywords.length > 0) {
        score += Math.min(foundKeywords.length * 7, 28);
        indicators.push("Suspicious URL keywords");
        reasons.push(
            `The URL contains sensitive action keywords: ${foundKeywords.join(", ")}.`
        );
    }

    // 12. Dangerous combinations in URL
    combinations.forEach(combo => {
        const matchesCombo = combo.words.every(w => lowerUrl.includes(w.toLowerCase()));
        if (matchesCombo) {
            score += combo.points;
            indicators.push(combo.name);
            const reasonText = (combo.reason && combo.reason[lang]) || combo.reason?.en || "Suspicious keyword combination in URL.";
            reasons.push(reasonText);
        }
    });

    score = Math.min(score, 100);

    return {
        score,
        indicators: Array.from(new Set(indicators)),
        reasons: Array.from(new Set(reasons)),
        hostname,
        isSuspicious: score >= 20,
        isLegitimate: false
    };
}

export default {
    extractUrls,
    isLegitimateDomain,
    safelyParseUrl,
    analyzeUrl
};
