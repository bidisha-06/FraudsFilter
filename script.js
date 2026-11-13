
import { UIController } from "./ui.js";
import { analyzeMessage } from "./scoring.js";
import { getTranslations } from "./rules.js";

const ui = new UIController();

const landingPage = document.getElementById("landingPage");
const dashboardApp = document.getElementById("dashboardApp");

const scannerView = document.getElementById("scannerView");
const resultView = document.getElementById("resultView");
const historyView = document.getElementById("historyView");
const guideView = document.getElementById("guideView");

const pageTitle = document.getElementById("pageTitle");
const pageSubtitle = document.getElementById("pageSubtitle");

const HISTORY_KEY = "fraudsfilter_review_history";

const sampleData = {
    high:
        "URGENT! Your bank account will be blocked within 24 hours. " +
        "Verify your KYC immediately and share your OTP using this link: " +
        "http://secure-bank-kyc.xyz/verify",

    medium:
        "Your payment is pending. Click this shortened link to check " +
        "your payment status immediately: http://bit.ly/payment-update",

    low:
        "Visit the official Google website: https://www.google.com"
};


/* ==========================================
   PAGE NAVIGATION
========================================== */

function openDashboard() {
    landingPage.classList.add("hidden");
    dashboardApp.classList.remove("hidden");

    showDashboardView("scanner");
}

function showDashboardView(view) {

    const views = {
        scanner: scannerView,
        result: resultView,
        history: historyView,
        guide: guideView
    };

    Object.values(views).forEach(element => {
        element.classList.add("hidden");
    });

    if (!views[view]) return;

    views[view].classList.remove("hidden");

    const titles = {
        scanner: ["Dashboard", "Analyse suspicious links and messages."],
        result: ["Analysis Result", "Review your security assessment."],
        history: ["Review History", "Access your previous analyses."],
        guide: ["Safety Guide", "Learn how to identify online threats."]
    };

    pageTitle.textContent = titles[view][0];
    pageSubtitle.textContent = titles[view][1];

    document.querySelectorAll(".sidebar-link").forEach(button => {
        button.classList.toggle(
            "active",
            button.dataset.view === view
        );
    });

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

    if (view === "history") {
        renderHistory();
    }
}


/* ==========================================
   NAVIGATION EVENTS
========================================== */

function initializeNavigation() {

    document.getElementById("landingStart")
        .addEventListener("click", openDashboard);

    document.getElementById("heroStart")
        .addEventListener("click", openDashboard);

    document.getElementById("aboutStart")
        .addEventListener("click", openDashboard);

    document.getElementById("backToHome")
        .addEventListener("click", () => {

            dashboardApp.classList.add("hidden");
            landingPage.classList.remove("hidden");

            window.scrollTo({
                top: 0,
                behavior: "smooth"
            });
        });

    document.getElementById("sidebarBrand")
        .addEventListener("click", event => {
            event.preventDefault();
            showDashboardView("scanner");
        });

    document.querySelectorAll(".sidebar-link").forEach(button => {

        button.addEventListener("click", () => {

            showDashboardView(button.dataset.view);

        });

    });

    document.getElementById("backToScanner")
        .addEventListener("click", () => {
            showDashboardView("scanner");
        });

}


/* ==========================================
   REVIEW HISTORY STORAGE
========================================== */

function getHistory() {

    try {

        return JSON.parse(
            localStorage.getItem(HISTORY_KEY) || "[]"
        );

    } catch (error) {

        console.error("Could not load review history:", error);

        return [];

    }

}


function saveReview(text, result) {

    const history = getHistory();

    const review = {
        id: Date.now(),
        text: text,
        risk: result.risk,
        confidence: result.confidence?.level || "LOW",
        date: new Date().toLocaleString()
    };

    history.unshift(review);

    // Keep the latest 50 reviews.
    localStorage.setItem(
        HISTORY_KEY,
        JSON.stringify(history.slice(0, 50))
    );

}


/* ==========================================
   RENDER REVIEW HISTORY
========================================== */

function renderHistory() {

    const historyList = document.getElementById("historyList");

    const history = getHistory();

    historyList.innerHTML = "";

    if (history.length === 0) {

        historyList.innerHTML = `
            <div class="history-empty">
                <h3>No Reviews Yet</h3>
                <p>Your analysed URLs and messages will appear here.</p>
            </div>
        `;

        return;
    }

    history.forEach((item, index) => {

        const row = document.createElement("div");

        row.className = "history-row";

        const risk = String(item.risk || "LOW").toLowerCase();

        const riskBadge = document.createElement("span");
        riskBadge.className = `history-risk ${risk}`;
        riskBadge.textContent = `${risk.toUpperCase()} RISK`;

        const details = document.createElement("div");
        details.className = "history-details";

        const text = document.createElement("b");
        text.textContent = item.text;

        const date = document.createElement("small");
        date.textContent = item.date;

        details.append(text, date);

        const reviewButton = document.createElement("button");
        reviewButton.className = "history-open";
        reviewButton.textContent = "Review Again";

        reviewButton.addEventListener("click", () => {

            ui.messageInput.value = item.text;

            updateCharCount();

            showDashboardView("scanner");

            runAnalysis();

        });

        row.append(riskBadge, details, reviewButton);

        historyList.appendChild(row);

    });

}


/* ==========================================
   CLEAR HISTORY
========================================== */

function initializeHistory() {

    document.getElementById("clearHistory")
        .addEventListener("click", () => {

            const history = getHistory();

            if (history.length === 0) return;

            const confirmClear = confirm(
                "Are you sure you want to clear all review history?"
            );

            if (!confirmClear) return;

            localStorage.removeItem(HISTORY_KEY);

            renderHistory();

        });

}


/* ==========================================
   CHARACTER COUNTER
========================================== */

function updateCharCount() {

    if (!ui.messageInput || !ui.charCount) return;

    const count = ui.messageInput.value.length;

    const translations = getTranslations(ui.currentLanguage);

    const template = translations.char_count || "{count} characters";

    ui.charCount.textContent = template.replace(
        "{count}",
        count
    );

}


/* ==========================================
   URL / MESSAGE ANALYSIS
========================================== */

function runAnalysis() {

    const text = ui.messageInput.value.trim();

    const translations = getTranslations(ui.currentLanguage);

    if (!text) {

        ui.showError(
            translations.error_empty || "Please enter a URL or message first."
        );

        return;

    }

    ui.clearError();

    try {

        // Use the existing FraudsFilter detection engine.
        const result = analyzeMessage(
            text,
            ui.currentLanguage
        );

        if (!result || !result.risk || !result.confidence) {

            throw new Error("Invalid analysis response.");

        }

        // Store the completed review.
        saveReview(text, result);

        // Navigate to the separate result page.
        showDashboardView("result");

        // Display the analysis result.
        ui.renderResult(result, text);

    } catch (error) {

        console.error("Analysis failed:", error);

        showDashboardView("scanner");

        ui.showError(
            "Unable to analyse this content. Please try again."
        );

    }

}


/* ==========================================
   SAMPLE LINK TESTING
========================================== */

function initializeSamples() {

    document.querySelectorAll(".sample-link").forEach(button => {

        button.addEventListener("click", () => {

            const type = button.dataset.sample;

            const sample = sampleData[type];

            if (!sample) return;

            ui.messageInput.value = sample;

            updateCharCount();

            ui.clearError();

            runAnalysis();

        });

    });


    // Existing Try Sample button.
    if (ui.sampleBtn) {

        ui.sampleBtn.addEventListener("click", () => {

            ui.messageInput.value = sampleData.high;

            updateCharCount();

            ui.clearError();

            runAnalysis();

        });

    }

}


/* ==========================================
   SCANNER EVENTS
========================================== */

function initializeScanner() {

    ui.messageInput.addEventListener("input", () => {

        updateCharCount();

        ui.clearError();

    });


    ui.messageInput.addEventListener("keydown", event => {

        if (
            (event.ctrlKey || event.metaKey) &&
            event.key === "Enter"
        ) {

            event.preventDefault();

            runAnalysis();

        }

    });


    ui.analyzeBtn.addEventListener("click", runAnalysis);

}


/* ==========================================
   RESULT ACTIONS
========================================== */

function initializeResultActions() {

    if (ui.copyResultBtn) {

        ui.copyResultBtn.addEventListener("click", () => {
            ui.copyResult();
        });

    }

    if (ui.shareResultBtn) {

        ui.shareResultBtn.addEventListener("click", () => {
            ui.shareResult();
        });

    }

    document.querySelectorAll(".feedback-btn").forEach(button => {

        button.addEventListener("click", () => {

            ui.handleFeedbackSelect(button.dataset.feedback);

        });

    });

    if (ui.submitFeedbackBtn) {

        ui.submitFeedbackBtn.addEventListener("click", () => {
            ui.saveFeedback();
        });

    }

    if (ui.exportFeedbackBtn) {

        ui.exportFeedbackBtn.addEventListener("click", () => {
            ui.exportFeedback();
        });

    }

}


/* ==========================================
   INITIALIZE APPLICATION
========================================== */

function initializeApp() {

    initializeNavigation();

    initializeScanner();

    initializeSamples();

    initializeHistory();

    initializeResultActions();

    updateCharCount();

    console.log("FraudsFilter application initialized.");

}


if (document.readyState === "loading") {

    document.addEventListener("DOMContentLoaded", initializeApp);

} else {

    initializeApp();

}


export {
    ui,
    runAnalysis,
    showDashboardView
};
