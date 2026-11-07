const messageInput =
    document.getElementById("messageInput");

const analyzeBtn =
    document.getElementById("analyzeBtn");

const sampleBtn =
    document.getElementById("sampleBtn");

const charCount =
    document.getElementById("charCount");


const resultCard =
    document.getElementById("resultCard");

const scoreValue =
    document.getElementById("scoreValue");

const scoreCircle =
    document.getElementById("scoreCircle");

const riskBadge =
    document.getElementById("riskBadge");

const riskTitle =
    document.getElementById("riskTitle");

const scoreHeading =
    document.getElementById("scoreHeading");

const scoreDescription =
    document.getElementById("scoreDescription");


const indicatorsList =
    document.getElementById("indicatorsList");

const categoriesList =
    document.getElementById("categoriesList");

const reasonsList =
    document.getElementById("reasonsList");

const recommendationsList =
    document.getElementById(
        "recommendationsList"
    );


/*
    SCAM PATTERNS
*/

const patterns = [

    {
        category: "Urgency",

        points: 12,

        words: [
            "urgent",
            "immediately",
            "act now",
            "right now",
            "within 24 hours",
            "last chance",
            "expires today"
        ],

        reason:
            "Uses urgency or time pressure to push the recipient into acting quickly."
    },


    {
        category: "Threat / Fear",

        points: 14,

        words: [
            "account blocked",
            "account suspended",
            "legal action",
            "police",
            "arrest",
            "penalty",
            "will be blocked",
            "will be suspended"
        ],

        reason:
            "Uses fear, threats, or consequences to pressure the recipient."
    },


    {
        category: "Credential Request",

        points: 18,

        words: [
            "otp",
            "password",
            "pin",
            "cvv",
            "verification code",
            "verify your account",
            "verify kyc",
            "login details"
        ],

        reason:
            "Requests sensitive authentication or financial information."
    },


    {
        category: "Payment Request",

        points: 15,

        words: [
            "send money",
            "transfer money",
            "pay now",
            "payment required",
            "processing fee",
            "registration fee",
            "deposit",
            "pay ₹",
            "pay rs"
        ],

        reason:
            "Requests money or a fee before the recipient has independently verified the request."
    },


    {
        category: "Fake Reward",

        points: 15,

        words: [
            "you won",
            "winner",
            "lottery",
            "prize",
            "cash reward",
            "free gift",
            "congratulations",
            "claim your reward"
        ],

        reason:
            "Uses a prize, reward, or unexpected benefit to attract the recipient."
    },


    {
        category: "Fake Job",

        points: 13,

        words: [
            "work from home",
            "easy money",
            "guaranteed income",
            "earn daily",
            "job offer",
            "part time job"
        ],

        reason:
            "Contains language commonly associated with suspicious job or income offers."
    },


    {
        category: "Impersonation",

        points: 13,

        words: [
            "bank officer",
            "customer care",
            "police officer",
            "government officer",
            "your manager",
            "support team",
            "official representative"
        ],

        reason:
            "Claims or implies an authority or trusted identity that should be independently verified."
    },


    {
        category: "Account Verification",

        points: 12,

        words: [
            "kyc update",
            "update your account",
            "verify kyc",
            "account verification",
            "reactivate account"
        ],

        reason:
            "Attempts to create a need for account or KYC verification."
    }

];


/*
    URL KEYWORDS
*/

const suspiciousUrlWords = [

    "login",
    "verify",
    "secure",
    "account",
    "update",
    "payment",
    "claim",
    "wallet",
    "bank",
    "kyc"

];


/*
    EXTRACT URLS
*/

function extractUrls(text) {

    const regex =
        /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;

    return text.match(regex) || [];
}


/*
    ANALYZE URL
*/
function analyzeUrl(url) {

    let score = 0;

    const reasons = [];
    const indicators = [];

    let normalized = url;

    if (!/^https?:\/\//i.test(normalized)) {
        normalized = "http://" + normalized;
    }

    let parsed;

    try {
        parsed = new URL(normalized);
    }

    catch {

        return {
            score: 25,
            indicators: ["Malformed URL"],
            reasons: [
                "The URL could not be parsed normally."
            ]
        };

    }

    const lowerUrl = url.toLowerCase();
    const hostname = parsed.hostname.toLowerCase();


    // --------------------------------
    // 1. HTTP instead of HTTPS
    // --------------------------------

    if (parsed.protocol === "http:") {

        score += 10;

        indicators.push("HTTP link");

        reasons.push(
            "The link uses HTTP instead of HTTPS."
        );

    }


    // --------------------------------
    // 2. Very long URL
    // --------------------------------

    if (url.length > 100) {

        score += 10;

        indicators.push("Very long URL");

        reasons.push(
            "The URL is unusually long."
        );

    }


    // --------------------------------
    // 3. @ symbol
    // --------------------------------

    if (url.includes("@")) {

        score += 20;

        indicators.push("@ symbol");

        reasons.push(
            "The URL contains an '@' symbol, which can sometimes be used to disguise the actual destination."
        );

    }


    // --------------------------------
    // 4. IP address
    // --------------------------------

    if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {

        score += 20;

        indicators.push("IP address URL");

        reasons.push(
            "The link uses an IP address instead of a conventional domain name."
        );

    }


    // --------------------------------
    // 5. Suspicious keywords
    // --------------------------------

    const suspiciousWords = [

        "login",
        "verify",
        "verification",
        "secure",
        "account",
        "update",
        "payment",
        "wallet",
        "bank",
        "kyc",
        "otp",
        "password",
        "claim",
        "refund"

    ];


    const foundWords =
        suspiciousWords.filter(word =>
            lowerUrl.includes(word)
        );


    if (foundWords.length > 0) {

        score += Math.min(
            foundWords.length * 7,
            35
        );

        indicators.push(
            "Suspicious URL keywords"
        );

        reasons.push(
            "The URL contains potentially sensitive action keywords: "
            + foundWords.join(", ")
            + "."
        );

    }


    // --------------------------------
    // 6. Dangerous combinations
    // --------------------------------

    const combinations = [

        {
            words: ["payment", "verification"],
            points: 25,
            name: "Payment verification pattern",
            reason:
                "The URL combines payment-related and verification-related terms."
        },

        {
            words: ["account", "login"],
            points: 20,
            name: "Account login pattern",
            reason:
                "The URL combines account and login-related terms."
        },

        {
            words: ["bank", "login"],
            points: 25,
            name: "Bank login pattern",
            reason:
                "The URL combines banking and login-related terms."
        },

        {
            words: ["verify", "otp"],
            points: 25,
            name: "OTP verification pattern",
            reason:
                "The URL contains both verification and OTP-related terms."
        },

        {
            words: ["payment", "login"],
            points: 20,
            name: "Payment login pattern",
            reason:
                "The URL combines payment and login-related terms."
        },

        {
            words: ["kyc", "verify"],
            points: 20,
            name: "KYC verification pattern",
            reason:
                "The URL combines KYC and verification-related terms."
        }

    ];


    combinations.forEach(combo => {

        const matched =
            combo.words.every(word =>
                lowerUrl.includes(word)
            );


        if (matched) {

            score += combo.points;

            indicators.push(
                combo.name
            );

            reasons.push(
                combo.reason
            );

        }

    });


    // --------------------------------
    // 7. Look-alike domains
    // --------------------------------

    const lookalikeTerms = [

        "paypa1",
        "g00gle",
        "faceb00k",
        "micros0ft",
        "amaz0n",
        "app1e",
        "instagrarn"

    ];


    const matchedLookalike =
        lookalikeTerms.find(term =>
            hostname.includes(term)
        );


    if (matchedLookalike) {

        score += 30;

        indicators.push(
            "Look-alike domain"
        );

        reasons.push(
            "The domain contains a look-alike spelling pattern."
        );

    }


    // --------------------------------
    // Limit score
    // --------------------------------

    score = Math.min(
        score,
        100
    );


    return {

        score,

        indicators,

        reasons

    };

}


/*
    ANALYZE MESSAGE
*/

function analyzeMessage(text) {

    const lower =
        text.toLowerCase();


    let score = 0;


    const categories =
        new Set();


    const indicators =
        new Set();


    const reasons = [];


    /*
        CHECK PATTERNS
    */

    patterns.forEach(
        pattern => {

            const foundWords =
                pattern.words.filter(
                    word =>
                        lower.includes(word)
                );


            if (
                foundWords.length > 0
            ) {

                categories.add(
                    pattern.category
                );


                indicators.add(
                    pattern.category
                );


                score += Math.min(
                    pattern.points,
                    foundWords.length * 6 + 6
                );


                reasons.push(
                    `${pattern.category}: ${pattern.reason}`
                );

            }

        }
    );


    /*
        CHECK URLS
    */

    const urls =
        extractUrls(text);


    urls.forEach(
        url => {

            const urlResult =
                analyzeUrl(url);


            score +=
                urlResult.score;


            urlResult.indicators
                .forEach(
                    item =>
                        indicators.add(item)
                );


            urlResult.reasons
                .forEach(
                    reason =>
                        reasons.push(reason)
                );

        }
    );


    /*
        COMBINATION RULES
    */

    if (

        categories.has(
            "Urgency"
        )

        &&

        categories.has(
            "Credential Request"
        )

    ) {

        score += 10;


        reasons.push(
            "Urgency combined with a request for sensitive information is a strong warning sign."
        );

    }


    if (

        categories.has(
            "Payment Request"
        )

        &&

        categories.has(
            "Fake Reward"
        )

    ) {

        score += 10;


        reasons.push(
            "A reward combined with a payment request can indicate an advance-fee scam pattern."
        );

    }


    /*
        LIMIT SCORE
    */

    score =
        Math.min(
            Math.round(score),
            100
        );


    /*
        RISK
    */

    let risk;


    if (
        score >= 70
    ) {

        risk = "HIGH";

    }

    else if (
        score >= 40
    ) {

        risk = "MEDIUM";

    }

    else {

        risk = "LOW";

    }


    return {

        score,

        risk,

        categories:
            [...categories],

        indicators:
            [...indicators],

        reasons,

        urls

    };

}


/*
    RECOMMENDATIONS
*/

function getRecommendations(
    result
) {


    if (
        result.risk === "HIGH"
    ) {

        return [

            "Do not click suspicious links or download unexpected files.",

            "Do not share OTPs, passwords, PINs, CVVs, or other sensitive credentials.",

            "Do not send money based only on the message.",

            "Verify the request through the organization's official website, app, or phone number.",

            "If you already shared sensitive information, contact the relevant service provider immediately."

        ];

    }


    if (
        result.risk === "MEDIUM"
    ) {

        return [

            "Verify the sender before taking any action.",

            "Avoid clicking unknown or unexpected links.",

            "Do not provide sensitive information until the request is independently verified.",

            "Check the organization's official website or app rather than using links in the message."

        ];

    }


    return [

        "No major scam indicators were detected by this prototype.",

        "Still verify unexpected requests independently.",

        "Never share passwords, OTPs, PINs, or CVVs with someone who contacts you unexpectedly."

    ];

}


/*
    DISPLAY RESULT
*/

function renderResult(
    result
) {

    resultCard.classList.remove(
        "hidden"
    );


    scoreValue.textContent =
        result.score;


    /*
        RISK BADGE
    */

    riskBadge.className =
        "risk-badge "
        + result.risk.toLowerCase();


    riskBadge.textContent =
        `${result.risk} RISK`;


    /*
        TEXT
    */

    if (
        result.risk === "HIGH"
    ) {

        riskTitle.textContent =
            "High-risk indicators detected";


        scoreHeading.textContent =
            "Strong warning signs found";


        scoreDescription.textContent =
            "Several characteristics of the submitted content match patterns commonly associated with scams.";

    }


    else if (
        result.risk === "MEDIUM"
    ) {

        riskTitle.textContent =
            "Some warning signs detected";


        scoreHeading.textContent =
            "Review before acting";


        scoreDescription.textContent =
            "The content contains indicators that deserve additional verification.";

    }


    else {

        riskTitle.textContent =
            "No major warning pattern detected";


        scoreHeading.textContent =
            "Lower-risk assessment";


        scoreDescription.textContent =
            "This prototype did not detect many common scam indicators. This does not prove the content is safe.";

    }


    /*
        SCORE COLOR
    */

    if (
        result.risk === "HIGH"
    ) {

        scoreCircle.style.borderColor =
            "var(--red)";

    }

    else if (
        result.risk === "MEDIUM"
    ) {

        scoreCircle.style.borderColor =
            "var(--orange)";

    }

    else {

        scoreCircle.style.borderColor =
            "var(--green)";

    }


    /*
        INDICATORS
    */

    indicatorsList.innerHTML = "";


    if (
        result.indicators.length === 0
    ) {

        indicatorsList.innerHTML =
            '<span class="indicator">No major indicator detected</span>';

    }

    else {

        result.indicators.forEach(
            item => {

                const element =
                    document.createElement(
                        "span"
                    );


                element.className =
                    "indicator";


                element.textContent =
                    item;


                indicatorsList.appendChild(
                    element
                );

            }
        );

    }


    /*
        CATEGORIES
    */

    categoriesList.innerHTML = "";


    if (
        result.categories.length === 0
    ) {

        categoriesList.innerHTML =
            '<span class="category">No clear category</span>';

    }

    else {

        result.categories.forEach(
            item => {

                const element =
                    document.createElement(
                        "span"
                    );


                element.className =
                    "category";


                element.textContent =
                    item;


                categoriesList.appendChild(
                    element
                );

            }
        );

    }


    /*
        REASONS
    */

    reasonsList.innerHTML = "";


    if (
        result.reasons.length === 0
    ) {

        reasonsList.innerHTML =
            "<li>No major warning explanation was generated.</li>";

    }

    else {

        result.reasons.forEach(
            reason => {

                const li =
                    document.createElement(
                        "li"
                    );


                li.textContent =
                    reason;


                reasonsList.appendChild(
                    li
                );

            }
        );

    }


    /*
        RECOMMENDATIONS
    */

    recommendationsList.innerHTML =
        "";


    getRecommendations(
        result
    ).forEach(
        recommendation => {

            const li =
                document.createElement(
                    "li"
                );


            li.textContent =
                recommendation;


            recommendationsList.appendChild(
                li
            );

        }
    );


    /*
        SCROLL TO RESULT
    */

    resultCard.scrollIntoView({

        behavior: "smooth",

        block: "start"

    });

}


/*
    ANALYZE BUTTON
*/

function runAnalysis() {

    const text =
        messageInput.value.trim();


    if (
        !text
    ) {

        alert(
            "Please paste a message or URL first."
        );

        messageInput.focus();

        return;

    }


    const result =
        analyzeMessage(text);


    renderResult(
        result
    );

}


/*
    CHARACTER COUNTER
*/

messageInput.addEventListener(
    "input",
    () => {

        charCount.textContent =
            `${messageInput.value.length} characters`;

    }
);


/*
    ANALYZE CLICK
*/

analyzeBtn.addEventListener(
    "click",
    runAnalysis
);


/*
    CTRL + ENTER
*/

messageInput.addEventListener(
    "keydown",
    event => {

        if (
            (event.ctrlKey ||
             event.metaKey)

            &&

            event.key === "Enter"
        ) {

            runAnalysis();

        }

    }
);


/*
    SAMPLE MESSAGE
*/

sampleBtn.addEventListener(
    "click",
    () => {

        messageInput.value =
            "URGENT! Your bank account will be blocked within 24 hours. " +
            "Verify your KYC and OTP immediately by clicking this link: " +
            "http://secure-account-login.com/verify";


        charCount.textContent =
            `${messageInput.value.length} characters`;


        runAnalysis();

    }
);