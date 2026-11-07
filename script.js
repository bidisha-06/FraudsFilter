/**
 * FraudsFilter - script.js
 * Main application entry point connecting detection engine modules with UI controller.
 */

import { UIController } from "./ui.js";
import { analyzeMessage } from "./scoring.js";
import { getTranslations } from "./rules.js";

// Initialize UI Controller
const ui = new UIController();

/**
 * Perform analysis on the user input message or URL.
 */
function runAnalysis() {
    const text = ui.messageInput ? ui.messageInput.value.trim() : "";
    const t = getTranslations(ui.currentLanguage);

    if (!text) {
        ui.showError(t.error_empty || "Please paste a message or URL first.");
        return;
    }

    ui.clearError();

    // Analyze message with current selected language context
    const result = analyzeMessage(text, ui.currentLanguage);

    // Render result with confidence levels and safe highlighting
    ui.renderResult(result, text);
}

/**
 * Update character count indicator.
 */
function updateCharCount() {
    if (!ui.messageInput || !ui.charCount) return;
    const count = ui.messageInput.value.length;
    const t = getTranslations(ui.currentLanguage);
    const template = t.char_count || "{count} characters";
    ui.charCount.textContent = template.replace("{count}", count);
}

/**
 * Attach DOM event listeners across all interactive components.
 */
function initializeEventListeners() {
    // Character Counter & Error Clearing
    if (ui.messageInput) {
        ui.messageInput.addEventListener("input", () => {
            updateCharCount();
            ui.clearError();
        });

        // Ctrl + Enter / Cmd + Enter shortcut
        ui.messageInput.addEventListener("keydown", event => {
            if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
                event.preventDefault();
                runAnalysis();
            }
        });
    }

    // Analyze Button
    if (ui.analyzeBtn) {
        ui.analyzeBtn.addEventListener("click", runAnalysis);
    }

    // Sample Button
    if (ui.sampleBtn) {
        ui.sampleBtn.addEventListener("click", () => {
            const sampleText =
                "URGENT! Your bank account will be blocked within 24 hours. " +
                "Verify your KYC and OTP immediately by clicking this link: " +
                "http://secure-account-login.com/verify";

            if (ui.messageInput) {
                ui.messageInput.value = sampleText;
                updateCharCount();
                ui.clearError();
            }

            runAnalysis();
        });
    }

    // Language Toggle
    document.querySelectorAll(".lang-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const lang = btn.dataset.lang;
            if (lang) {
                ui.setLanguage(lang);
                updateCharCount();
            }
        });
    });

    // Copy and Share Result
    if (ui.copyResultBtn) {
        ui.copyResultBtn.addEventListener("click", () => ui.copyResult());
    }

    if (ui.shareResultBtn) {
        ui.shareResultBtn.addEventListener("click", () => ui.shareResult());
    }

    // User Feedback Buttons
    document.querySelectorAll(".feedback-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const feedbackType = btn.dataset.feedback;
            if (feedbackType) {
                ui.handleFeedbackSelect(feedbackType);
            }
        });
    });

    if (ui.submitFeedbackBtn) {
        ui.submitFeedbackBtn.addEventListener("click", () => ui.saveFeedback());
    }

    if (ui.exportFeedbackBtn) {
        ui.exportFeedbackBtn.addEventListener("click", () => ui.exportFeedback());
    }
}

// Initialize when DOM is ready
if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initializeEventListeners);
    } else {
        initializeEventListeners();
    }
}

export {
    ui,
    runAnalysis
};
