import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { analyzeCallTranscript, getRecommendations } from "../scoring.js";
import {
    SAMPLE_CALLS,
    formatTime,
    getSampleTranscript,
    decodeAudioTo16kHz,
    initWhisperPipeline,
    setWhisperPipelineLoader,
    transcribeAudioWithWhisper,
    VoiceAnalyzer
} from "../voice.js";

describe("Voice Call Scam Detection & Vishing Analysis", () => {
    it("has predefined realistic sample calls with valid transcripts", () => {
        expect(Array.isArray(SAMPLE_CALLS)).toBe(true);
        expect(SAMPLE_CALLS.length).toBeGreaterThanOrEqual(3);

        SAMPLE_CALLS.forEach(sample => {
            expect(sample.id).toBeDefined();
            expect(sample.title).toBeDefined();
            expect(sample.transcript).toBeDefined();
            expect(sample.transcript.length).toBeGreaterThan(20);
            expect(sample.risk).toMatch(/^(HIGH|MEDIUM|LOW)$/);
        });
    });

    it("correctly identifies CBI / Customs Digital Arrest call as HIGH RISK SCAM", () => {
        const cbiSample = SAMPLE_CALLS.find(s => s.id === "cbi_scam");
        expect(cbiSample).toBeDefined();

        const result = analyzeCallTranscript(cbiSample.transcript, { duration: "0:24", audioName: "cbi_call.wav" });

        expect(result.risk).toBe("HIGH");
        expect(result.confidence.level).toBe("HIGH");
        expect(result.isVishing).toBe(true);
        expect(result.callVerdict).toBe("SCAM CALL DETECTED");
        expect(result.callType).toContain("Digital Arrest");
        expect(result.categories).toContain("Authority & Courier Impersonation");
        expect(result.categories).toContain("Threat / Fear");
        expect(result.categories).toContain("Digital Arrest & Call Coercion");
        expect(result.vishingRedFlags.length).toBeGreaterThan(0);
    });

    it("correctly identifies Bank KYC & OTP call as HIGH RISK SCAM", () => {
        const kycSample = SAMPLE_CALLS.find(s => s.id === "kyc_scam");
        expect(kycSample).toBeDefined();

        const result = analyzeCallTranscript(kycSample.transcript, { duration: "0:18", audioName: "kyc_call.wav" });

        expect(result.risk).toBe("HIGH");
        expect(result.isVishing).toBe(true);
        expect(result.callVerdict).toBe("SCAM CALL DETECTED");
        expect(result.categories).toContain("Credential Request");
        expect(result.categories).toContain("Urgency");
    });

    it("correctly identifies benign clinic appointment call as LIKELY LEGITIMATE CALL", () => {
        const clinicSample = SAMPLE_CALLS.find(s => s.id === "clinic_legit");
        expect(clinicSample).toBeDefined();

        const result = analyzeCallTranscript(clinicSample.transcript, { duration: "0:14", audioName: "clinic.wav" });

        expect(result.risk).toBe("LOW");
        expect(result.isVishing).toBe(false);
        expect(result.callVerdict).toBe("LIKELY LEGITIMATE CALL");
        expect(result.indicators.length).toBe(0);
    });

    it("detects remote desktop (AnyDesk/TeamViewer) vishing calls", () => {
        const text = "This is Microsoft technical support. Your computer has 5 viruses. Please install AnyDesk from play store and read me the 9 digit address right now.";
        const result = analyzeCallTranscript(text);

        expect(result.risk).toBe("HIGH");
        expect(result.isVishing).toBe(true);
        expect(result.callType).toContain("Remote Access");
        expect(result.categories).toContain("Remote Access & Screen Sharing");
    });

    it("provides specific call safety recommendations for high-risk calls", () => {
        const fakeCall = "Police officer calling. Stay on the line under digital arrest or we will arrest you.";
        const result = analyzeCallTranscript(fakeCall);
        const recs = getRecommendations(result, "en");

        expect(recs.some(r => r.includes("Hang up immediately"))).toBe(true);
        expect(recs.some(r => r.includes("1930"))).toBe(true);
    });

    it("handles empty or invalid call transcripts safely", () => {
        const result = analyzeCallTranscript("");
        expect(result.risk).toBe("LOW");
        expect(result.isVishing).toBe(false);
        expect(result.callVerdict).toBe("LIKELY LEGITIMATE CALL");
    });

    it("detects Hindi / Hinglish vishing and digital arrest calls", () => {
        const hindiCall = "Aapka courier parcel customs me parcel seized ho gaya hai. Phone mat katna, line par bane rahe aur turant police inspector se baat karein.";
        const result = analyzeCallTranscript(hindiCall, {}, "hi");

        expect(result.risk).toBe("HIGH");
        expect(result.isVishing).toBe(true);
        expect(result.categories).toContain("Digital Arrest & Call Coercion");
        expect(result.categories).toContain("Authority & Courier Impersonation");

        const recsHi = getRecommendations(result, "hi");
        expect(recsHi.length).toBeGreaterThan(0);
        expect(recsHi[0]).toContain("तुरंत कॉल काट दें");
    });

    it("detects Bengali vishing calls with threat and credential demands", () => {
        const bengaliCall = "CBI theke bolchi, apnar account block kora hobe 24 ghontar moddhe. Phone katben na ebong ekhoni otp share korun.";
        const result = analyzeCallTranscript(bengaliCall, {}, "bn");

        expect(result.risk).toBe("HIGH");
        expect(result.isVishing).toBe(true);
        expect(result.categories).toContain("Digital Arrest & Call Coercion");
        expect(result.categories).toContain("Credential Request");

        const recsBn = getRecommendations(result, "bn");
        expect(recsBn.length).toBeGreaterThan(0);
        expect(recsBn[0]).toContain("অবিলম্বে ফোন কেটে দিন");
    });

    it("formats seconds into mm:ss time display", () => {
        expect(formatTime(0)).toBe("0:00");
        expect(formatTime(65)).toBe("1:05");
        expect(formatTime(125)).toBe("2:05");
        expect(formatTime(null)).toBe("0:00");
    });

    it("matches sample calls by filename or keyword via getSampleTranscript", () => {
        const cbi = getSampleTranscript("cbi_digital_arrest_scam.wav");
        expect(cbi).toBeDefined();
        expect(cbi.transcript).toContain("Inspector Vikram Singh");

        const kyc = getSampleTranscript("bank_kyc_fraud_call.wav");
        expect(kyc).toBeDefined();
        expect(kyc.transcript).toContain("SBI Bank Card Verification");

        const clinic = getSampleTranscript("clinic_legit.wav");
        expect(clinic).toBeDefined();
        expect(clinic.transcript).toContain("City Care Dental Clinic");

        expect(getSampleTranscript("unknown_custom_audio.wav")).toBeNull();
        expect(getSampleTranscript("")).toBeNull();
    });
});

describe("In-Browser Transformers.js Whisper Speech-to-Text Pipeline", () => {
    afterEach(() => {
        setWhisperPipelineLoader(null);
    });

    it("decodes audio to 16kHz Float32Array safely", async () => {
        const mockBlob = {
            arrayBuffer: async () => new ArrayBuffer(1024),
            name: "test_call.wav"
        };

        const result = await decodeAudioTo16kHz(mockBlob);
        expect(result).toBeInstanceOf(Float32Array);
        expect(result.length).toBeGreaterThanOrEqual(16000);
    });

    it("initializes Whisper pipeline singleton and returns transcriber", async () => {
        const transcriber = await initWhisperPipeline();
        expect(typeof transcriber).toBe("function");

        const output = await transcriber(new Float32Array(16000));
        expect(output).toBeDefined();
        expect(output.text).toBeDefined();
    });

    it("supports custom pipeline loader injection for testing", async () => {
        const mockLoader = vi.fn().mockResolvedValue(async (audioData, options) => {
            expect(audioData).toBeInstanceOf(Float32Array);
            return { text: "Custom injected transcription result" };
        });

        setWhisperPipelineLoader(mockLoader);

        const transcriber = await initWhisperPipeline();
        expect(mockLoader).toHaveBeenCalledTimes(1);

        const output = await transcriber(new Float32Array(16000), {});
        expect(output.text).toBe("Custom injected transcription result");
    });

    it("transcribes sample calls instantaneously with 100% progress", async () => {
        const progressUpdates = [];
        const onProgress = update => progressUpdates.push(update);

        const sampleResult = await transcribeAudioWithWhisper(
            { name: "cbi_digital_arrest_scam.wav" },
            onProgress,
            "cbi_digital_arrest_scam.wav"
        );

        expect(sampleResult.isSample).toBe(true);
        expect(sampleResult.text).toContain("Inspector Vikram Singh");
        expect(progressUpdates.length).toBeGreaterThan(0);
        expect(progressUpdates[progressUpdates.length - 1].percent).toBe(100);
    });

    it("transcribes custom uploaded audio via Whisper pipeline and tracks progress", async () => {
        const mockCustomTranscriber = vi.fn().mockResolvedValue({
            text: "Attention customer, your electricity connection will be disconnected tonight. Pay bill immediately."
        });

        setWhisperPipelineLoader(async onProgress => {
            onProgress({ status: "progress", loaded: 20000000, total: 39000000 });
            onProgress({ status: "ready" });
            return mockCustomTranscriber;
        });

        const progressUpdates = [];
        const mockAudioBlob = {
            name: "custom_recorded_call.wav",
            arrayBuffer: async () => new ArrayBuffer(2048)
        };

        const result = await transcribeAudioWithWhisper(
            mockAudioBlob,
            update => progressUpdates.push(update),
            "custom_recorded_call.wav"
        );

        expect(result.isSample).toBe(false);
        expect(result.text).toContain("electricity connection");
        expect(mockCustomTranscriber).toHaveBeenCalledTimes(1);

        // Verify progression through stages
        const stages = progressUpdates.map(p => p.stage);
        expect(stages).toContain("decoding");
        expect(stages).toContain("loading_model");
        expect(stages).toContain("transcribing");
        expect(stages).toContain("done");
    });

    it("throws error when transcribing without audio input", async () => {
        await expect(transcribeAudioWithWhisper(null, () => {}, ""))
            .rejects
            .toThrow("No audio recording provided for transcription.");
    });

    it("initializes VoiceAnalyzer class safely without document crashes", () => {
        const analyzer = new VoiceAnalyzer();
        expect(analyzer).toBeDefined();
        expect(analyzer.isExtracting).toBe(false);
        expect(analyzer.isRecording).toBe(false);
        expect(typeof analyzer.convertUploadedAudioToText).toBe("function");
        expect(typeof analyzer.runCallAnalysis).toBe("function");
    });
});
