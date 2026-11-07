/**
 * FraudsFilter - ui.js
 * DOM manipulation, highlighting, language switching, feedback, and result rendering.
 */

import { getTranslations } from "./rules.js";
import { getRecommendations, escapeRegex } from "./scoring.js";

/**
 * Safely escape untrusted text to prevent XSS.
 * @param {string} str
 * @returns {string}
 */
export function escapeHtml(str) {
    if (!str || typeof str !== "string") return "";
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

/**
 * Generate safe HTML with highlighted suspicious tokens inside the user's message.
 * Does not alter the original message.
 * 
 * @param {string} text - Raw user message
 * @param {Array<object>} matches - Array of { word, category }
 * @returns {string} Safe HTML string with <mark> tags
 */
export function generateHighlightedHtml(text, matches = []) {
    if (!text) return "";
    if (!matches || matches.length === 0) {
        return escapeHtml(text);
    }

    // Find all match occurrences with non-overlapping index ranges
    const matchRanges = [];

    matches.forEach(item => {
        const word = (item.word || "").trim();
        if (!word) return;

        try {
            const escaped = escapeRegex(word);
            // Word boundary regex with Unicode support
            const regex = new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, "giu");
            let match;
            while ((match = regex.exec(text)) !== null) {
                const start = match.index;
                const end = start + match[0].length;
                matchRanges.push({
                    start,
                    end,
                    category: item.category || "Warning Sign",
                    matchedText: match[0]
                });
            }
        } catch {
            // Fallback to simple indexOf if regex fails on special symbols
            let idx = text.toLowerCase().indexOf(word.toLowerCase());
            while (idx !== -1) {
                matchRanges.push({
                    start: idx,
                    end: idx + word.length,
                    category: item.category || "Warning Sign",
                    matchedText: text.substring(idx, idx + word.length)
                });
                idx = text.toLowerCase().indexOf(word.toLowerCase(), idx + word.length);
            }
        }
    });

    if (matchRanges.length === 0) {
        return escapeHtml(text);
    }

    // Sort by start index ascending, then by length descending
    matchRanges.sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start));

    // Remove overlapping intervals
    const filteredRanges = [];
    let lastEnd = 0;
    for (const r of matchRanges) {
        if (r.start >= lastEnd) {
            filteredRanges.push(r);
            lastEnd = r.end;
        }
    }

    // Build highlighted string piece by piece
    let html = "";
    let currentIndex = 0;

    filteredRanges.forEach(r => {
        // Text before the match
        if (r.start > currentIndex) {
            html += escapeHtml(text.substring(currentIndex, r.start));
        }

        // Highlighted token
        const tokenText = escapeHtml(r.matchedText);
        const catLabel = escapeHtml(r.category);
        const catClass = r.category.toLowerCase().replace(/[^a-z0-9]/g, "-");

        html += `<mark class="highlight-token ${catClass}" title="${catLabel}">${tokenText}<span class="highlight-tag">${catLabel}</span></mark>`;

        currentIndex = r.end;
    });

    // Remainder of message
    if (currentIndex < text.length) {
        html += escapeHtml(text.substring(currentIndex));
    }

    return html;
}

/**
 * UI Controller class managing DOM updates, language toggles, feedback, and sharing.
 */
export class UIController {
    constructor() {
        this.currentLanguage = "en";
        this.currentResult = null;
        this.currentText = "";
        this.selectedFeedbackType = null;

        if (typeof document !== "undefined") {
            this.cacheDomElements();
        }
    }

    cacheDomElements() {
        this.messageInput = document.getElementById("messageInput");
        this.analyzeBtn = document.getElementById("analyzeBtn");
        this.sampleBtn = document.getElementById("sampleBtn");
        this.charCount = document.getElementById("charCount");

        this.inlineError = document.getElementById("inlineError");
        this.privacyBanner = document.getElementById("privacyBanner");

        this.resultCard = document.getElementById("resultCard");
        this.riskTitle = document.getElementById("riskTitle");
        this.riskBadge = document.getElementById("riskBadge");
        this.scoreCircle = document.getElementById("scoreCircle");
        this.scoreValue = document.getElementById("scoreValue");
        this.scoreUnit = document.getElementById("scoreUnit");
        this.scoreHeading = document.getElementById("scoreHeading");
        this.scoreDescription = document.getElementById("scoreDescription");

        this.highlightedSection = document.getElementById("highlightedSection");
        this.highlightedContent = document.getElementById("highlightedContent");

        this.indicatorsList = document.getElementById("indicatorsList");
        this.categoriesList = document.getElementById("categoriesList");
        this.reasonsList = document.getElementById("reasonsList");
        this.recommendationsList = document.getElementById("recommendationsList");

        this.copyResultBtn = document.getElementById("copyResultBtn");
        this.shareResultBtn = document.getElementById("shareResultBtn");
        this.actionFeedback = document.getElementById("actionFeedback");

        this.feedbackSection = document.getElementById("feedbackSection");
        this.feedbackForm = document.getElementById("feedbackForm");
        this.feedbackNotes = document.getElementById("feedbackNotes");
        this.submitFeedbackBtn = document.getElementById("submitFeedbackBtn");
        this.exportFeedbackBtn = document.getElementById("exportFeedbackBtn");
        this.feedbackStatus = document.getElementById("feedbackStatus");
    }

    /**
     * Show an inline error message without alert().
     * @param {string} msg
     */
    showError(msg) {
        if (!this.inlineError) return;
        this.inlineError.textContent = msg;
        this.inlineError.classList.remove("hidden");
        this.inlineError.scrollIntoView({ behavior: "smooth", block: "nearest" });
        if (this.messageInput) {
            this.messageInput.focus();
        }
    }

    /**
     * Clear any active inline error.
     */
    clearError() {
        if (!this.inlineError) return;
        this.inlineError.textContent = "";
        this.inlineError.classList.add("hidden");
    }

    /**
     * Switch active language and update UI strings.
     * @param {string} lang - 'en', 'hi', or 'bn'
     */
    setLanguage(lang) {
        this.currentLanguage = lang;
        const t = getTranslations(lang);

        // Update active class on toggle buttons
        document.querySelectorAll(".lang-btn").forEach(btn => {
            btn.classList.toggle("active", btn.dataset.lang === lang);
        });

        // Update static UI elements
        const appTitle = document.getElementById("brandTitle");
        if (appTitle && t.app_title) appTitle.textContent = t.app_title;

        const tagline = document.getElementById("brandTagline");
        if (tagline && t.tagline) tagline.textContent = t.tagline;

        const heroEyebrow = document.getElementById("heroEyebrow");
        if (heroEyebrow && t.eyebrow_hero) heroEyebrow.textContent = t.eyebrow_hero;

        const heroTitle = document.getElementById("heroTitle");
        if (heroTitle && t.hero_title) heroTitle.innerHTML = t.hero_title.replace(/\n/g, "<br>");

        const heroDesc = document.getElementById("heroDesc");
        if (heroDesc && t.hero_desc) heroDesc.textContent = t.hero_desc;

        if (this.privacyBanner && t.privacy_notice) {
            this.privacyBanner.textContent = t.privacy_notice;
        }

        const scanTitle = document.getElementById("scanTitle");
        if (scanTitle && t.scan_title) scanTitle.textContent = t.scan_title;

        const scanDesc = document.getElementById("scanDesc");
        if (scanDesc && t.scan_desc) scanDesc.textContent = t.scan_desc;

        if (this.sampleBtn && t.try_sample) this.sampleBtn.textContent = t.try_sample;

        if (this.messageInput && t.input_placeholder) {
            this.messageInput.placeholder = t.input_placeholder;
        }

        if (this.analyzeBtn && t.analyze_btn) {
            this.analyzeBtn.innerHTML = `<span>${t.analyze_btn}</span><span>→</span>`;
        }

        // Action and Feedback Buttons
        if (this.copyResultBtn && t.copy_result) this.copyResultBtn.textContent = t.copy_result;
        if (this.shareResultBtn && t.share_result) this.shareResultBtn.textContent = t.share_result;
        if (this.feedbackNotes && t.feedback_notes_placeholder) {
            this.feedbackNotes.placeholder = t.feedback_notes_placeholder;
        }
        if (this.submitFeedbackBtn && t.feedback_submit) {
            this.submitFeedbackBtn.textContent = t.feedback_submit;
        }
        if (this.exportFeedbackBtn && t.feedback_export) {
            this.exportFeedbackBtn.textContent = t.feedback_export;
        }

        const feedbackTitle = document.getElementById("feedbackTitle");
        if (feedbackTitle && t.feedback_title) feedbackTitle.textContent = t.feedback_title;

        const btnCorrect = document.querySelector('[data-feedback="correct"]');
        if (btnCorrect && t.feedback_correct) btnCorrect.textContent = t.feedback_correct;

        const btnFp = document.querySelector('[data-feedback="false_positive"]');
        if (btnFp && t.feedback_false_positive) btnFp.textContent = t.feedback_false_positive;

        const btnMissed = document.querySelector('[data-feedback="missed_scam"]');
        if (btnMissed && t.feedback_missed) btnMissed.textContent = t.feedback_missed;

        const highlightedTitle = document.getElementById("highlightedTitle");
        if (highlightedTitle && t.highlighted_title) highlightedTitle.textContent = t.highlighted_title;

        const disclaimer = document.getElementById("disclaimerText");
        if (disclaimer && t.disclaimer_text) disclaimer.textContent = t.disclaimer_text;

        // Re-render result in new language if active
        if (this.currentResult && this.currentText) {
            this.renderResult(this.currentResult, this.currentText);
        }
    }

    /**
     * Render analysis results with confidence levels, highlighting, and recommendations.
     * 
     * @param {object} result - Analysis result object
     * @param {string} originalText - The user's original message
     */
    renderResult(result, originalText) {
        this.currentResult = result;
        this.currentText = originalText;
        this.selectedFeedbackType = null;

        const t = getTranslations(this.currentLanguage);

        if (!this.resultCard) return;
        this.resultCard.classList.remove("hidden");

        // 1. Confidence Display in Circular Badge
        const confLevel = result.confidence.level || "LOW";
        if (this.scoreValue) {
            this.scoreValue.textContent = confLevel;
            this.scoreValue.className = `conf-text ${confLevel.toLowerCase()}`;
        }
        if (this.scoreUnit) {
            this.scoreUnit.textContent = t.confidence_label || "CONFIDENCE";
        }

        // Circle Border Color
        if (this.scoreCircle) {
            if (result.risk === "HIGH") {
                this.scoreCircle.style.borderColor = "var(--red)";
            } else if (result.risk === "MEDIUM") {
                this.scoreCircle.style.borderColor = "var(--orange)";
            } else {
                this.scoreCircle.style.borderColor = "var(--green)";
            }
        }

        // 2. Risk Badge and Title
        if (this.riskBadge) {
            this.riskBadge.className = `risk-badge ${result.risk.toLowerCase()}`;
            this.riskBadge.textContent = t[`risk_${result.risk.toLowerCase()}`] || `${result.risk} RISK`;
        }

        if (this.riskTitle) {
            this.riskTitle.textContent = result.confidence.label;
        }

        if (this.scoreHeading) {
            this.scoreHeading.textContent = result.risk === "HIGH"
                ? (this.currentLanguage === "hi" ? "मजबूत चेतावनी संकेत मिले" : this.currentLanguage === "bn" ? "শক্তিশালী সতর্কবার্তা পাওয়া গেছে" : "Strong warning signs found")
                : result.risk === "MEDIUM"
                ? (this.currentLanguage === "hi" ? "सत्यापन की आवश्यकता है" : this.currentLanguage === "bn" ? "যাচাইকরণ প্রয়োজন" : "Review before acting")
                : (this.currentLanguage === "hi" ? "कम जोखिम का मूल्यांकन" : this.currentLanguage === "bn" ? "কম ঝুঁকির মূল্যায়ন" : "Lower-risk assessment");
        }

        if (this.scoreDescription) {
            // Explain why this confidence was assigned
            this.scoreDescription.textContent = result.confidence.reason;
        }

        // 3. Highlighted Message
        if (this.highlightedContent) {
            const safeHtml = generateHighlightedHtml(originalText, result.matchedKeywords);
            this.highlightedContent.innerHTML = safeHtml;
        }

        // 4. Detected Indicators
        if (this.indicatorsList) {
            this.indicatorsList.innerHTML = "";
            if (result.indicators.length === 0) {
                this.indicatorsList.innerHTML = `<span class="indicator">${this.currentLanguage === "hi" ? "कोई बड़ा संकेतक नहीं मिला" : this.currentLanguage === "bn" ? "কোনো বড় সতর্কবার্তা নেই" : "No major indicator detected"}</span>`;
            } else {
                result.indicators.forEach(item => {
                    const el = document.createElement("span");
                    el.className = "indicator";
                    el.textContent = item;
                    this.indicatorsList.appendChild(el);
                });
            }
        }

        // 5. Scam Patterns / Categories
        if (this.categoriesList) {
            this.categoriesList.innerHTML = "";
            if (result.categories.length === 0) {
                this.categoriesList.innerHTML = `<span class="category">${this.currentLanguage === "hi" ? "कोई स्पष्ट श्रेणी नहीं" : this.currentLanguage === "bn" ? "কোনো নির্দিষ্ট ক্যাটাগরি নেই" : "No clear category"}</span>`;
            } else {
                result.categories.forEach(item => {
                    const el = document.createElement("span");
                    el.className = "category";
                    el.textContent = item;
                    this.categoriesList.appendChild(el);
                });
            }
        }

        // 6. Reasons
        if (this.reasonsList) {
            this.reasonsList.innerHTML = "";
            if (result.reasons.length === 0) {
                this.reasonsList.innerHTML = `<li>${this.currentLanguage === "hi" ? "कोई गंभीर चेतावनी नहीं मिली।" : this.currentLanguage === "bn" ? "কোনো বড় সতর্কবার্তা পাওয়া যায়নি।" : "No major warning explanation was generated."}</li>`;
            } else {
                result.reasons.forEach(r => {
                    const li = document.createElement("li");
                    li.textContent = r;
                    this.reasonsList.appendChild(li);
                });
            }
        }

        // 7. Recommendations
        if (this.recommendationsList) {
            this.recommendationsList.innerHTML = "";
            const recs = getRecommendations(result, this.currentLanguage);
            recs.forEach(rec => {
                const li = document.createElement("li");
                li.textContent = rec;
                this.recommendationsList.appendChild(li);
            });
        }

        // 8. Reset Feedback and Action status
        if (this.feedbackForm) this.feedbackForm.classList.add("hidden");
        if (this.feedbackStatus) {
            this.feedbackStatus.classList.add("hidden");
            this.feedbackStatus.textContent = "";
        }
        document.querySelectorAll(".feedback-btn").forEach(btn => btn.classList.remove("selected"));

        if (this.actionFeedback) {
            this.actionFeedback.classList.add("hidden");
            this.actionFeedback.textContent = "";
        }

        // Smooth scroll
        this.resultCard.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    /**
     * Copy assessment summary to clipboard safely.
     */
    async copyResult() {
        if (!this.currentResult) return;
        const t = getTranslations(this.currentLanguage);

        const summary = [
            `🛡️ FraudsFilter Assessment:`,
            `• Risk Level: ${this.currentResult.risk} RISK`,
            `• Confidence: ${this.currentResult.confidence.label}`,
            `• Confidence Note: ${this.currentResult.confidence.reason}`,
            `• Categories: ${this.currentResult.categories.join(", ") || "None"}`,
            `• Indicators: ${this.currentResult.indicators.join(", ") || "None"}`,
            `• Safety Recommendation: ${this.currentResult.risk === "HIGH" ? "Do not click links or share credentials." : "Verify independently."}`,
            `\nAnalyzed client-side with FraudsFilter (No server upload).`
        ].join("\n");

        let copied = false;
        if (navigator.clipboard && navigator.clipboard.writeText) {
            try {
                await navigator.clipboard.writeText(summary);
                copied = true;
            } catch {
                copied = false;
            }
        }

        if (!copied) {
            // Fallback for older browsers
            const ta = document.createElement("textarea");
            ta.value = summary;
            ta.style.position = "fixed";
            ta.style.left = "-9999px";
            document.body.appendChild(ta);
            ta.select();
            try {
                document.execCommand("copy");
                copied = true;
            } catch {
                copied = false;
            }
            document.body.removeChild(ta);
        }

        this.showActionNotice(copied ? (t.result_copied || "Copied to clipboard!") : "Could not copy automatically.");
    }

    /**
     * Share assessment summary via navigator.share with clipboard fallback.
     */
    async shareResult() {
        if (!this.currentResult) return;
        const t = getTranslations(this.currentLanguage);

        const shareText = `FraudsFilter Assessment: ${this.currentResult.risk} RISK (${this.currentResult.confidence.label}). Evaluated for safety without server upload.`;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: t.share_title || "FraudsFilter Assessment",
                    text: shareText,
                    url: window.location.href
                });
                return;
            } catch (err) {
                if (err.name === "AbortError") return; // User canceled share
            }
        }

        // Fallback to copying
        await this.copyResult();
        this.showActionNotice(t.share_fallback || "Summary copied to clipboard!");
    }

    showActionNotice(text) {
        if (!this.actionFeedback) return;
        this.actionFeedback.textContent = text;
        this.actionFeedback.classList.remove("hidden");
        setTimeout(() => {
            this.actionFeedback.classList.add("hidden");
        }, 3000);
    }

    /**
     * Handle user feedback selection.
     * @param {string} feedbackType - 'correct' | 'false_positive' | 'missed_scam'
     */
    handleFeedbackSelect(feedbackType) {
        this.selectedFeedbackType = feedbackType;
        document.querySelectorAll(".feedback-btn").forEach(btn => {
            btn.classList.toggle("selected", btn.dataset.feedback === feedbackType);
        });

        if (this.feedbackForm) {
            this.feedbackForm.classList.remove("hidden");
        }
    }

    /**
     * Save feedback to localStorage.
     */
    saveFeedback() {
        if (!this.currentResult || !this.selectedFeedbackType) return;
        const t = getTranslations(this.currentLanguage);

        const feedbackData = {
            id: "fb_" + Date.now(),
            timestamp: new Date().toISOString(),
            language: this.currentLanguage,
            messageSnippet: this.currentText.substring(0, 300),
            detectedRisk: this.currentResult.risk,
            confidenceLevel: this.currentResult.confidence.level,
            confidenceReason: this.currentResult.confidence.reason,
            categories: this.currentResult.categories,
            indicators: this.currentResult.indicators,
            feedbackType: this.selectedFeedbackType,
            userComment: this.feedbackNotes ? this.feedbackNotes.value.trim() : ""
        };

        try {
            const existing = JSON.parse(localStorage.getItem("fraudsfilter_feedback_logs") || "[]");
            existing.push(feedbackData);
            localStorage.setItem("fraudsfilter_feedback_logs", JSON.stringify(existing));

            if (this.feedbackStatus) {
                this.feedbackStatus.textContent = t.feedback_saved || "Thank you! Feedback saved locally in your browser.";
                this.feedbackStatus.classList.remove("hidden");
            }
            if (this.feedbackForm) {
                this.feedbackForm.classList.add("hidden");
            }
        } catch {
            if (this.feedbackStatus) {
                this.feedbackStatus.textContent = "Unable to write to local storage.";
                this.feedbackStatus.classList.remove("hidden");
            }
        }
    }

    /**
     * Export all stored feedback as a JSON file.
     */
    exportFeedback() {
        try {
            const logs = localStorage.getItem("fraudsfilter_feedback_logs") || "[]";
            const blob = new Blob([logs], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `fraudsfilter_feedback_${Date.now()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch {
            this.showActionNotice("Could not export feedback data.");
        }
    }
}

export default UIController;
