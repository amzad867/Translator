/*
====================================================
 AMZ OPS TRANSLATE
 GEMINI TRANSCRIPTION
====================================================
*/

const SERVER_URL =
    "https://translator-z4j7.onrender.com";


let selectedAudio = null;
let lastArabicText = "";


const audioFile =
    document.getElementById("audioFile");

const audioArea =
    document.getElementById("audioArea");

const audioPlayer =
    document.getElementById("audioPlayer");

const audioName =
    document.getElementById("audioName");

const translateBtn =
    document.getElementById("translateBtn");

const removeAudio =
    document.getElementById("removeAudio");

const resultCard =
    document.getElementById("resultCard");

const resultText =
    document.getElementById("resultText");

const copyBtn =
    document.getElementById("copyBtn");

const shareBtn =
    document.getElementById("shareBtn");


/* ================================================
   STATUS
================================================ */

function showStatus(message) {

    resultCard.classList.remove(
        "hidden"
    );

    resultText.textContent =
        message;
}


/* ================================================
   SELECT AUDIO
================================================ */

audioFile.addEventListener(
    "change",
    function () {

        const file =
            this.files[0];

        if (!file) return;


        selectedAudio =
            file;


        audioName.textContent =
            file.name;


        audioPlayer.src =
            URL.createObjectURL(
                file
            );


        audioArea.classList
            .remove("hidden");


        resultCard.classList
            .add("hidden");
    }
);


/* ================================================
   REMOVE
================================================ */

removeAudio.addEventListener(
    "click",
    function () {

        selectedAudio = null;

        audioFile.value = "";

        audioPlayer.src = "";

        audioArea.classList
            .add("hidden");

        resultCard.classList
            .add("hidden");

        lastArabicText = "";
    }
);


/* ================================================
   GEMINI TRANSCRIPTION
================================================ */

async function transcribeWithGemini(
    file
) {

    showStatus(
        "☁️ Uploading voice..."
    );


    const formData =
        new FormData();


    formData.append(
        "audio",
        file
    );


    showStatus(
        "🧠 Gemini is transcribing Arabic voice..."
    );


    const response =
        await fetch(
            SERVER_URL +
            "/transcribe",
            {
                method: "POST",

                body: formData
            }
        );


    const data =
        await response.json();


    if (!response.ok) {

        throw new Error(
            data?.details ||
            data?.error ||
            "Gemini transcription failed."
        );
    }


    if (
        !data.text ||
        !data.text.trim()
    ) {

        throw new Error(
            "No Arabic speech detected."
        );
    }


    return data.text.trim();
}


/* ================================================
   SHOW RESULT
================================================ */

function showResult(
    text
) {

    lastArabicText =
        text;


    resultCard.classList
        .remove("hidden");


    resultText.innerHTML =
        "";


    const title =
        document.createElement(
            "div"
        );


    title.textContent =
        "🇸🇦 Arabic Text";


    title.style.fontWeight =
        "700";


    title.style.marginBottom =
        "10px";


    const paragraph =
        document.createElement(
            "div"
        );


    paragraph.textContent =
        text;


    paragraph.dir =
        "rtl";


    paragraph.lang =
        "ar";


    paragraph.style.textAlign =
        "right";


    paragraph.style.fontSize =
        "20px";


    paragraph.style.lineHeight =
        "1.9";


    resultText.appendChild(
        title
    );


    resultText.appendChild(
        paragraph
    );
}


/* ================================================
   CONVERT BUTTON
================================================ */

translateBtn.addEventListener(
    "click",
    async function () {

        if (!selectedAudio) {

            alert(
                "Please select a voice first."
            );

            return;
        }


        translateBtn.disabled =
            true;


        translateBtn.textContent =
            "⏳ Transcribing...";


        try {

            const text =
                await transcribeWithGemini(
                    selectedAudio
                );


            showResult(
                text
            );

        }

        catch (error) {

            console.error(
                error
            );


            showStatus(
                "❌ " +
                (
                    error.message ||
                    "Transcription failed."
                )
            );
        }


        finally {

            translateBtn.disabled =
                false;


            translateBtn.textContent =
                "✨ Convert Voice to Text";
        }
    }
);


/* ================================================
   COPY
================================================ */

copyBtn.addEventListener(
    "click",
    async function () {

        if (!lastArabicText)
            return;


        await navigator.clipboard
            .writeText(
                lastArabicText
            );


        copyBtn.textContent =
            "✓ Copied";


        setTimeout(
            () => {

                copyBtn.textContent =
                    "📋 Copy";

            },
            1500
        );
    }
);


/* ================================================
   SHARE
================================================ */

shareBtn.addEventListener(
    "click",
    async function () {

        if (!lastArabicText)
            return;


        if (
            navigator.share
        ) {

            await navigator.share({

                title:
                    "AMZ Ops Translate",

                text:
                    lastArabicText
            });

        }

        else {

            await navigator.clipboard
                .writeText(
                    lastArabicText
                );


            alert(
                "Arabic text copied."
            );
        }
    }
);