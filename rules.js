/**
 * FraudsFilter - rules.js
 * Loads and manages scam detection rules, categories, URL rules, and multilingual translations.
 */

import rulesJson from "./rules.json" with { type: "json" };

let activeRules = rulesJson;

/**
 * Get all active detection rules.
 * @returns {object}
 */
export function getRules() {
    return activeRules;
}

/**
 * Get message pattern categories.
 * @returns {Array<object>}
 */
export function getCategories() {
    return activeRules.categories || [];
}

/**
 * Get centralized URL analysis rules.
 * @returns {object}
 */
export function getUrlRules() {
    return activeRules.url_rules || {};
}

/**
 * Get translations for a specific language ('en', 'hi', or 'bn').
 * @param {string} lang
 * @returns {object}
 */
export function getTranslations(lang = "en") {
    if (activeRules.translations && activeRules.translations[lang]) {
        return activeRules.translations[lang];
    }
    return activeRules.translations?.en || {};
}

/**
 * Asynchronously reload rules from rules.json (useful if updated dynamically in HTTP environment).
 * @param {string} path
 * @returns {Promise<object>}
 */
export async function loadRulesJson(path = "./rules.json") {
    try {
        if (typeof fetch === "function") {
            const res = await fetch(path);
            if (res.ok) {
                activeRules = await res.json();
            }
        }
    } catch {
        // Fallback to bundled rules if fetch fails (e.g. file:// protocol)
    }
    return activeRules;
}

export default {
    getRules,
    getCategories,
    getUrlRules,
    getTranslations,
    loadRulesJson
};

