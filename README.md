# 🛡️ FraudsFilter

### Digital Safety Analyzer & Suspicious Message Detection System

## 🚀 Project Overview

**FraudsFilter** is an open-source, client-side digital safety web application designed to help users identify, analyze, and recognize potentially fraudulent or suspicious messages, links, and scams before taking action.

Paste an SMS, email, WhatsApp message, job offer, UPI payment request, or URL. FraudsFilter evaluates the content against heuristic scam patterns, domain spoofing techniques, and social-engineering triggers, providing clear, explainable, and confidence-based risk assessments.

> 🔒 **Privacy Guarantee:** All analysis executes 100% locally inside your web browser. No messages, URLs, or personal data are ever uploaded, transmitted, or stored on external servers.

---

## 🛠️ Technologies Used

- **HTML5** – Semantic markup and accessible UI components.
- **CSS3** – Responsive styling, modular layout, custom badge indicators, and highlight mark tags.
- **JavaScript (ES Modules)** – Modular frontend architecture, regex boundary pattern matching, and domain parsing.
- **Vitest** – Automated unit testing suite verifying detection logic, boundary conditions, and sanitization.

---

## 📁 Project Structure

```text
FraudsFilter/
│
├── index.html                  # Main application HTML interface
├── style.css                   # Main application stylesheet and responsive styles
├── script.js                   # Application entry point & event wiring
│
├── rules.json                  # Centralized detection rules, categories, and translations
├── rules.js                    # Rule loader, category manager, and translation helpers
├── url.js                      # URL extraction, domain parsing, and domain-based analysis
├── scoring.js                  # Signal detection, confidence calculation, and risk scoring
├── ui.js                       # DOM manipulation, highlighting, feedback, and sharing
│
├── tests/                      # Automated unit test suite
│   ├── detection.test.js       # Core detection, word-boundary, India-specific, Hinglish & Bengali tests
│   └── ui.test.js              # XSS sanitization, safe highlighting, and recommendation tests
│
├── package.json                # Project metadata, scripts, and dev dependencies (Vitest)
└── README.md                   # Project documentation
```

---

## 🚦 Getting Started & Execution

### 1. Clone or Download the Repository

Clone this repository to your local machine:

```bash
git clone https://github.com/bidisha-06/FraudsFilter.git
cd FraudsFilter
```

Or download and extract the ZIP file directly.

### 2. Install Development Dependencies (Optional, for Unit Tests)

FraudsFilter runs in any modern browser without requiring dependencies. To run the automated unit test suite:

```bash
npm install
```

### 3. Launch the Application

#### Option A: Run with VS Code Live Server (Recommended)
1. Open the `FraudsFilter` directory in Visual Studio Code.
2. Install the **Live Server** extension (by Ritwick Dey).
3. Right-click `index.html` and choose **Open with Live Server**.

#### Option B: Local HTTP Server
Using Python:
```bash
# Python 3
python -m http.server 8000
```
Then visit `http://localhost:8000` in your web browser.

#### Option C: Direct Browser Open
Double-click `index.html` to open it directly in Google Chrome, Microsoft Edge, Mozilla Firefox, or Safari.

---

## 🧪 Running Unit Tests

FraudsFilter includes a test suite covering keyword detection, word-boundary protection, Hinglish/Bengali patterns, URL extraction, and security sanitization.

Run the tests using Vitest:

```bash
npm test
```

To run tests in interactive watch mode:

```bash
npm run test:watch
```

---

## 🌟 Key Features

1. **Confidence-Based Assessments**
   - Eliminates misleading mathematical scores (such as `73/100`) in favor of clear confidence ratings (**Low Confidence**, **Medium Confidence**, **High Confidence**).
   - Accompanying plain-language explanations clarify *why* a given confidence rating was determined.

2. **In-Message Content Highlighting**
   - Highlights detected suspicious words, deceptive phrases, and URLs directly in the analyzed message.
   - Shows badge tags indicating which scam category triggered each highlight without altering original text.
   - Built with strict HTML entity escaping to eliminate XSS risks.

3. **India-Specific & Regional Scam Patterns**
   - **UPI & Payment Fraud:** Detects "enter UPI PIN to receive money", advance fees, and QR code scams.
   - **Electricity Bill Fraud:** Identifies threats of immediate power disconnection ("tonight 9:30 PM").
   - **Courier & Customs Impersonation:** Flags fake FedEx/customs parcel seizure and "digital arrest" scams.
   - **KYC & Banking Threats:** Detects fake SBI/YONO/PAN/Aadhaar expired alerts and account block threats.
   - **Multilingual Support:** Evaluates English, Hinglish ("khata band", "turant sampark kare"), and Bengali ("biddut line kete dewa hobe", "taka pete upi pin din").

4. **Advanced URL & Domain Security Analysis**
   - Centralized rule definitions with deduplicated rules.
   - Extracts URLs with or without protocols (`http://`, `https://`, `www.`, naked domains, shorteners).
   - Flags direct IP address links (`192.168.1.1`), look-alike typosquatting domains (`paypa1`, `g00gle`), brand-spoofing subdomains (`sbi.co.in.fake-portal.com`), and risky TLDs (`.xyz`, `.top`).
   - Protects legitimate official domains (`support.google.com`, `onlinesbi.sbi`) from false-positive keyword flagging.

5. **User Feedback & Data Collection**
   - "Was this correct?" feedback system with options for **Correct Detection**, **False Positive**, and **Missed Scam**.
   - Locally records feedback with timestamps and detected signals for future model training datasets.
   - Built-in **Export Feedback (JSON)** feature.

6. **Sharing, Copying & Inline Error Handling**
   - Replaced browser `alert()` popups with inline, accessible UI notification banners.
   - **Copy Result** button copies a formatted summary to clipboard.
   - **Share Result** utilizes the Web Share API on mobile/supported browsers with automatic clipboard fallback.

7. **Multilingual Interface Switcher**
   - One-click toggle between **English**, **Hinglish**, and **বাংলা (Bengali)** for UI headings, reasons, recommendations, and feedback options.

---

## 👥 Contributors

Developed collaboratively as an academic digital safety and cybersecurity project.

## 📄 License

This project is developed for educational and academic purposes.

---

### Built with ❤️ by the FraudsFilter Team
*Promoting safer and smarter digital interactions.*
