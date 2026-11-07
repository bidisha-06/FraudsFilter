import { describe, it, expect } from "vitest";
import { matchWithWordBoundary, analyzeMessage, calculateConfidence } from "../scoring.js";
import { extractUrls, analyzeUrl, safelyParseUrl, isLegitimateDomain } from "../url.js";
import { getRules, getCategories, getUrlRules, getTranslations } from "../rules.js";

describe("1. Rules Management", () => {
    it("loads categories and rules successfully", () => {
        const rules = getRules();
        expect(rules).toBeDefined();
        expect(Array.isArray(rules.categories)).toBe(true);
        expect(rules.categories.length).toBeGreaterThanOrEqual(7);

        const categories = getCategories();
        expect(categories.length).toBeGreaterThanOrEqual(7);

        const urlRules = getUrlRules();
        expect(Array.isArray(urlRules.suspicious_words)).toBe(true);
        expect(Array.isArray(urlRules.combinations)).toBe(true);
        expect(Array.isArray(urlRules.lookalike_domains)).toBe(true);
    });

    it("provides multi-language translations", () => {
        const en = getTranslations("en");
        const hi = getTranslations("hi");
        const bn = getTranslations("bn");

        expect(en.risk_high).toBe("HIGH RISK");
        expect(hi.risk_high).toContain("HIGH RISK");
        expect(bn.risk_high).toContain("HIGH RISK");
    });
});

describe("2. Word-Boundary Matching & False-Positive Prevention", () => {
    it("matches exact keywords with proper boundaries", () => {
        expect(matchWithWordBoundary("This is urgent, please check", "urgent")).toBe(true);
        expect(matchWithWordBoundary("URGENT: action required", "urgent")).toBe(true);
        expect(matchWithWordBoundary("Please enter your PIN now", "pin")).toBe(true);
    });

    it("prevents false-positive substring matches", () => {
        // 'urgent' must not match 'detergent'
        expect(matchWithWordBoundary("Please buy detergent from the market", "urgent")).toBe(false);

        // 'pin' must not match 'spinning' or 'pinpoint'
        expect(matchWithWordBoundary("The spinning top stopped", "pin")).toBe(false);
        expect(matchWithWordBoundary("We must pinpoint the issue", "pin")).toBe(false);

        // 'pay' must not match 'taxpayer'
        expect(matchWithWordBoundary("Every taxpayer is registered", "pay")).toBe(false);
    });

    it("evaluates benign everyday messages as LOW risk and LOW confidence", () => {
        const result = analyzeMessage("Hey, let's meet at 5 PM for coffee in the cafeteria.");
        expect(result.risk).toBe("LOW");
        expect(result.confidence.level).toBe("LOW");
        expect(result.indicators.length).toBe(0);
    });

    it("does not flag routine Indian payment mentions without threats or credentials", () => {
        const result = analyzeMessage("I will pay you using UPI tomorrow after work.");
        expect(result.risk).toBe("LOW");
    });
});

describe("3. India-Specific Scam Patterns", () => {
    it("detects UPI scams requesting PIN to receive money", () => {
        const msg = "Congratulations! You won Rs 10000. Enter UPI PIN to receive money in your account.";
        const result = analyzeMessage(msg);
        expect(result.risk).toBe("HIGH");
        expect(result.categories).toContain("Payment Request & UPI Fraud");
        expect(result.confidence.level).toBe("HIGH");
    });

    it("detects electricity disconnection threats", () => {
        const msg = "Dear customer, your electricity power will be disconnected tonight at 9:30 PM due to unpaid bill. Immediately contact electricity officer.";
        const result = analyzeMessage(msg);
        expect(result.risk).toBe("HIGH");
        expect(result.categories).toContain("Threat / Fear");
        expect(result.categories).toContain("Urgency");
    });

    it("detects parcel seized / customs fraud (FedEx scam)", () => {
        const msg = "Your FedEx courier parcel has been seized by customs department due to illegal narcotics found in package. Case registered against you.";
        const result = analyzeMessage(msg);
        expect(result.risk).toBe("HIGH");
        expect(result.categories).toContain("Authority & Courier Impersonation");
        expect(result.categories).toContain("Threat / Fear");
    });

    it("detects fake government schemes and job fraud", () => {
        const msg = "PM Kisan Yojana approved cash reward! Work from home and like YouTube videos to earn daily payout.";
        const result = analyzeMessage(msg);
        expect(result.risk).toBe("HIGH");
        expect(result.categories).toContain("Fake Job / Task Scam");
    });
});

describe("4. Hinglish Detection", () => {
    it("detects Hinglish bank and KYC threat patterns", () => {
        const msg = "Aapka bank khata band ho jayega 24 ghante ke andar. Turant KYC update karein.";
        const result = analyzeMessage(msg);
        expect(result.risk).toBe("HIGH");
        expect(result.categories).toContain("Threat / Fear");
        expect(result.categories).toContain("Account & KYC Verification");
        expect(result.categories).toContain("Urgency");
    });

    it("detects Hinglish lottery and prize scams", () => {
        const msg = "Badhai ho! Aapne lucky draw me jeeta hai inami rashi. Turant reward claim kare.";
        const result = analyzeMessage(msg);
        expect(result.categories).toContain("Fake Reward / Lottery");
    });

    it("detects Hinglish electricity threats", () => {
        const msg = "Bijli kaat di jayegi aaj raat. Turant sampark kare.";
        const result = analyzeMessage(msg);
        expect(result.categories).toContain("Threat / Fear");
    });
});

describe("5. Bengali Detection", () => {
    it("detects Bengali bank account and KYC threats", () => {
        const msg = "Apnar bank account bondho hobe 24 ghontar moddhe. Ekhoni kyc update korun.";
        const result = analyzeMessage(msg);
        expect(result.risk).toBe("HIGH");
        expect(result.categories).toContain("Threat / Fear");
        expect(result.categories).toContain("Account & KYC Verification");
    });

    it("detects Bengali electricity disconnection scams", () => {
        const msg = "Biddut line kete dewa hobe ajkei, biddut connection kata hobe jodi taka na den.";
        const result = analyzeMessage(msg);
        expect(result.categories).toContain("Threat / Fear");
    });

    it("detects Bengali lottery and prize scams", () => {
        const msg = "Apni jitechen bisesh puroshkar! Taka pete upi pin din ebong claim korun.";
        const result = analyzeMessage(msg);
        expect(result.risk).toBe("HIGH");
        expect(result.categories).toContain("Fake Reward / Lottery");
    });
});

describe("6. URL Extraction and Domain Analysis", () => {
    it("reliably extracts URLs with protocols, www, or naked domains", () => {
        const text = "Check this out https://secure-login.xyz/portal and also www.verify-bank.com/kyc and bit.ly/claim123.";
        const urls = extractUrls(text);
        expect(urls.length).toBe(3);
        expect(urls).toContain("https://secure-login.xyz/portal");
        expect(urls).toContain("www.verify-bank.com/kyc");
        expect(urls).toContain("bit.ly/claim123");
    });

    it("strips trailing sentence punctuation from URLs", () => {
        const text = "Visit https://example.com/update, immediately! Or click http://test.com/path.";
        const urls = extractUrls(text);
        expect(urls).toContain("https://example.com/update");
        expect(urls).toContain("http://test.com/path");
    });

    it("identifies direct IP address URLs as suspicious", () => {
        const res = analyzeUrl("http://192.168.1.100/login");
        expect(res.isSuspicious).toBe(true);
        expect(res.indicators).toContain("IP address URL");
    });

    it("detects brand spoofing in subdomains", () => {
        const res = analyzeUrl("http://sbi.co.in.fake-security-portal.com/login");
        expect(res.isSuspicious).toBe(true);
        expect(res.indicators).toContain("Brand spoofing domain");
    });

    it("detects look-alike / typosquatting domains", () => {
        const res = analyzeUrl("https://www.paypa1-update.com/signin");
        expect(res.isSuspicious).toBe(true);
        expect(res.indicators).toContain("Look-alike domain");
    });

    it("detects suspicious / high-risk domain extensions", () => {
        const res = analyzeUrl("https://quick-verification.xyz/bank");
        expect(res.isSuspicious).toBe(true);
        expect(res.indicators).toContain("Suspicious domain extension");
    });

    it("detects URL shorteners", () => {
        const res = analyzeUrl("https://tinyurl.com/kyc-update");
        expect(res.isSuspicious).toBe(true);
        expect(res.indicators).toContain("URL shortener");
    });

    it("does NOT flag legitimate domains based on path keywords", () => {
        const res = analyzeUrl("https://support.google.com/accounts/answer/123");
        expect(res.isSuspicious).toBe(false);
        expect(res.isLegitimate).toBe(true);

        const sbiRes = analyzeUrl("https://www.onlinesbi.sbi/login");
        expect(sbiRes.isSuspicious).toBe(false);
        expect(sbiRes.isLegitimate).toBe(true);
    });

    it("handles malformed URLs safely without throwing errors", () => {
        const parsed = safelyParseUrl("ht tp://not a url");
        expect(parsed).toBeNull();

        const res = analyzeUrl("ht tp://not a url");
        expect(res.score).toBe(25);
        expect(res.indicators).toContain("Malformed URL");
    });
});

describe("7. Confidence-Level Calculation", () => {
    it("reports LOW confidence for 0 signals", () => {
        const conf = calculateConfidence(0, [], [], false, "en");
        expect(conf.level).toBe("LOW");
        expect(conf.reason).toContain("No suspicious indicators");
    });

    it("reports LOW confidence with clear reason for a single isolated signal", () => {
        const conf = calculateConfidence(1, ["Urgency"], ["Urgency"], false, "en");
        expect(conf.level).toBe("LOW");
        expect(conf.reason).toContain("only 1 isolated suspicious signal detected");
    });

    it("reports MEDIUM confidence for two signals", () => {
        const conf = calculateConfidence(2, ["Urgency", "Credential Request"], ["Urgency", "Credential Request"], false, "en");
        expect(conf.level).toBe("MEDIUM");
        expect(conf.reason).toContain("2 distinct warning signals detected");
    });

    it("reports HIGH confidence for dangerous combinations or 3+ signals", () => {
        const conf = calculateConfidence(3, ["Urgency", "Threat / Fear", "Credential Request"], ["Urgency", "Threat / Fear", "Credential Request"], true, "en");
        expect(conf.level).toBe("HIGH");
        expect(conf.reason).toContain("multiple strong warning signs");
    });
});

describe("8. Malformed & Edge-Case Input Handling", () => {
    it("handles empty strings, null, and non-strings safely", () => {
        const emptyRes = analyzeMessage("");
        expect(emptyRes.risk).toBe("LOW");
        expect(emptyRes.confidence.level).toBe("LOW");

        const nullRes = analyzeMessage(null);
        expect(nullRes.risk).toBe("LOW");

        const undefRes = analyzeMessage(undefined);
        expect(undefRes.risk).toBe("LOW");
    });

    it("handles text containing only symbols and whitespace safely", () => {
        const res = analyzeMessage("   !!! @@@ $$$ %%% ^^^ &&& ***   ");
        expect(res.risk).toBe("LOW");
        expect(res.indicators.length).toBe(0);
    });
});

