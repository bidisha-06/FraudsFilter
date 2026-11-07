import { describe, it, expect } from "vitest";
import { generateHighlightedHtml, escapeHtml } from "../ui.js";
import { analyzeMessage, getRecommendations } from "../scoring.js";

describe("UI Highlighting & Security Sanitization", () => {
    it("escapes malicious HTML characters to prevent XSS", () => {
        const raw = '<script>alert("hack")</script> & <img src=x onerror=alert(1)>';
        const escaped = escapeHtml(raw);
        expect(escaped).not.toContain("<script>");
        expect(escaped).toContain("&lt;script&gt;");
        expect(escaped).toContain("&amp;");
        expect(escaped).toContain("&lt;img");
    });

    it("generates highlighted HTML without altering original text content", () => {
        const text = "URGENT! Your bank account will be blocked within 24 hours.";
        const matches = [
            { word: "urgent", category: "Urgency" },
            { word: "account blocked", category: "Threat / Fear" }
        ];

        const html = generateHighlightedHtml(text, matches);
        expect(html).toContain('<mark class="highlight-token urgency"');
        expect(html).toContain('URGENT<span class="highlight-tag">Urgency</span></mark>');
        expect(html).toContain("will be");
    });

    it("prevents XSS when highlighting user messages containing HTML tags", () => {
        const text = 'URGENT <img src="x" onerror="alert(1)"> OTP verification';
        const matches = [
            { word: "urgent", category: "Urgency" },
            { word: "otp", category: "Credential Request" }
        ];

        const html = generateHighlightedHtml(text, matches);
        expect(html).not.toContain('<img src="x"');
        expect(html).toContain("&lt;img");
    });

    it("handles original sample message correctly with High Risk and High Confidence", () => {
        const sampleText =
            "URGENT! Your bank account will be blocked within 24 hours. " +
            "Verify your KYC and OTP immediately by clicking this link: " +
            "http://secure-account-login.com/verify";

        const result = analyzeMessage(sampleText);
        expect(result.risk).toBe("HIGH");
        expect(result.confidence.level).toBe("HIGH");
        expect(result.categories).toContain("Urgency");
        expect(result.categories).toContain("Threat / Fear");
        expect(result.categories).toContain("Credential Request");
        expect(result.urls.length).toBe(1);

        const recsEn = getRecommendations(result, "en");
        expect(recsEn.length).toBeGreaterThan(0);
        expect(recsEn[0]).toContain("Do not click suspicious links");

        const recsHi = getRecommendations(result, "hi");
        expect(recsHi.length).toBeGreaterThan(0);
        expect(recsHi[1]).toContain("ओटीपी");

        const recsBn = getRecommendations(result, "bn");
        expect(recsBn.length).toBeGreaterThan(0);
        expect(recsBn[1]).toContain("ওটিপি");
    });
});

