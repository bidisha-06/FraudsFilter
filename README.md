# 🛡️ FraudsFilter
### Smart Fraud & Suspicious Link Detection Platform

FraudsFilter is a web-based fraud detection platform designed to help users identify potentially fraudulent URLs and suspicious online activities. It provides a simple interface where users can submit links for analysis, understand potential security risks, and make safer decisions before interacting with unknown websites.

The platform aims to make online safety awareness easier through URL analysis, risk assessment, and review history.

---

## 🚀 Key Features

### 1. Landing Page
- Professional landing page introducing FraudsFilter.
- Clear overview of the platform and its purpose.
- Get Started option to access the main application.

### 2. User Dashboard
- Centralized dashboard for accessing the platform's features.
- Sidebar navigation for easy movement between sections.
- Organized interface for URL scanning and reviewing previous results.

### 3. URL Scanner
- Enter or paste a URL for security analysis.
- Submit suspicious links for risk assessment.
- Simple and user-friendly scanning interface.

### 4. 🎙️ Voice Call Analyzer (New)
- **Audio File Upload & Live Recording**: Upload call recordings (`.mp3`, `.wav`, `.m4a`, `.ogg`, `.webm`) or record live incoming phone audio with the browser microphone.
- **Audio Player & Waveform Visualizer**: Interactive audio player with custom controls, seek timeline, duration display, and live reactive waveform visualization.
- **In-Browser Whisper AI Transcription (Transformers.js)**: Runs OpenAI's Whisper model (`Xenova/whisper-tiny.en`) directly inside the browser using `@xenova/transformers`.
  - **Zero Backend**: All speech-to-text inference runs locally in client-side WebAssembly / Web Audio API.
  - **Zero API Keys**: Free, open-source model running on the user's device without any API tokens or credentials.
  - **Smooth Audio Extraction**: Decodes audio formats and resamples to 16,000 Hz mono PCM `Float32Array` before running chunked Whisper inference.
  - **Live Dictate / Mic Option**: Also supports real-time microphone dictation for fast hands-free testing.
- **Vishing & Scam Call Detection**: Evaluates the transcribed call against scam categories, identifying:
  - Law enforcement & CBI impersonation (Digital Arrest scams)
  - Bank & telecom KYC suspension threats demanding OTPs/PINs
  - Remote desktop software solicitation (AnyDesk, TeamViewer)
  - Utility disconnection extortion calls
- **Sample Call Recordings**: 1-click test scenarios with realistic audio and verified transcripts (CBI Digital Arrest, Bank KYC Vishing, Routine Clinic Appointment).
- **Vishing Safety Recommendations**: Actionable emergency guidance (hang up immediately, report to Cyber Crime Helpline 1930).

### 5. Separate Analysis Result Page
- Displays the analysis result in a separate view after URL submission.
- Presents the detected risk level.
- Provides relevant information to help users understand the result.

### 5. Risk-Level Sample URLs
Includes sample URLs to help users understand and test the scanner:

| Risk Level | Purpose |
|---|---|
| 🔴 High Risk | Example of a potentially dangerous or suspicious URL |
| 🟠 Medium Risk | Example of a URL requiring additional verification |
| 🟢 Low Risk | Example of a commonly trusted website |

*Note: Sample URLs are provided for demonstration and testing. Actual risk classifications depend on the detection engine.*

### 6. Review History
- Maintains a record of previous URL reviews.
- Allows users to revisit earlier analysis results.
- Helps users keep track of scanned URLs.

### 7. Safety Guide
- Provides basic online security awareness.
- Highlights precautions to take before opening unknown links.
- Encourages users to identify suspicious online activities.

---

## 🛠️ Technologies Used

| Technology | Purpose |
|---|---|
| HTML5 | Website structure |
| CSS3 | Styling and responsive layout |
| JavaScript (ES Modules) | Application functionality and interactions |
| Web Audio API & MediaRecorder | In-browser audio decoding, playback, and live mic capture |
| Web Speech API | Client-side speech-to-text recognition |
| Local Storage | Storing review history in the browser |

---

## 📁 Project Structure

```text
FraudsFilter/
│
├── index.html
├── style.css
├── script.js
│
├── scoring.js
├── rules.js
├── rules.json
├── url.js
├── ui.js
├── voice.js
│
├── assets/
│   ├── audio/
│   │   ├── cbi_digital_arrest_scam.wav
│   │   ├── bank_kyc_fraud_call.wav
│   │   └── legitimate_appointment_call.wav
│   ├── images/
│   └── icons/
│
├── tests/
│   ├── detection.test.js
│   ├── ui.test.js
│   └── voice.test.js
│
└── README.md
```

*The folder structure may vary depending on the existing project configuration. Retain any additional files required by the application.*

---

## ⚙️ Getting Started

Follow these steps to run FraudsFilter locally.

### Prerequisites
- A modern web browser.
- Visual Studio Code (recommended).
- Live Server extension (recommended).

### Installation

**Step 1: Clone the repository**

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
```

**Step 2: Open the project folder**

```bash
cd FraudsFilter
```

**Step 3: Open in Visual Studio Code**

```bash
code .
```

**Step 4: Run the application**

Open `index.html` using the Live Server extension in VS Code.

Alternatively, open the HTML file directly in your browser if the project does not require a local development server.

---

## 🔄 How It Works

1. Open the FraudsFilter landing page.
2. Click **Get Started** to enter the dashboard.
3. Navigate to the URL Scanner section.
4. Paste the URL you want to review.
5. Click the scan or analyze button.
6. View the analysis result on the separate result page.
7. Check the risk level and review the available information.
8. Visit Review History to access previous scans.

---

## 🎯 Project Objectives

- Promote safer internet browsing.
- Help users recognize potentially fraudulent links.
- Provide an accessible platform for URL risk assessment.
- Improve awareness of suspicious online activities.
- Present analysis results in a clear and understandable format.

---

## 🔐 Security Notice

FraudsFilter is intended as an assistance tool for identifying potentially suspicious URLs. Its results should not be treated as a guarantee that a website is safe or malicious.

- Never share passwords, OTPs, banking details, or other sensitive information with untrusted websites.
- Verify website domains before entering personal information.
- Avoid clicking unfamiliar or suspicious links.
- A low-risk result does not guarantee complete website safety.

---

## 🚧 Future Enhancements

- Integration with advanced phishing and fraud detection APIs.
- Real-time threat intelligence.
- Improved URL reputation analysis.
- User authentication and personalized dashboards.
- Cloud-based review history.
- Detailed security reports and analytics.
- Enhanced detection using machine learning.

---

## 👥 Contributors

**FraudsFilter Development Team**

Developed as a project to promote digital security awareness and help users make informed decisions when interacting with online links.

---

## 📜 License

This project is developed for educational and demonstration purposes. Licensing and reuse permissions can be defined by the project maintainers.

---

<p align="center">
  **FraudsFilter — Think Before You Click. Stay Safe Online.** 🛡️
</p>