import express from "express";
import multer from "multer";
import cors from "cors";

const app = express();

const PORT = process.env.PORT || 10000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

app.use(cors());


// ============================================
// HOME / HEALTH CHECK
// ============================================

app.get("/", (req, res) => {
    res.json({
        status: "ok",
        service: "AMZ Ops Translate",
        model: "gemini-3.5-transcribe"
    });
});


// ============================================
// MULTER
// ============================================

const upload = multer({
    storage: multer.memoryStorage(),

    limits: {
        fileSize: 50 * 1024 * 1024
    }
});


// ============================================
// TRANSCRIBE
// ============================================

app.post(
    "/transcribe",
    upload.single("audio"),
    async (req, res) => {

        try {

            // --------------------------------
            // API KEY CHECK
            // --------------------------------

            if (!GEMINI_API_KEY) {

                return res.status(500).json({
                    error:
                        "GEMINI_API_KEY is not configured on the server."
                });
            }


            // --------------------------------
            // AUDIO CHECK
            // --------------------------------

            if (!req.file) {

                return res.status(400).json({
                    error:
                        "No audio file received."
                });
            }


            let mimeType =
                req.file.mimetype;


            // --------------------------------
            // FIX UNKNOWN MIME TYPE
            // --------------------------------

            if (
                !mimeType ||
                mimeType === "application/octet-stream" ||
                mimeType === "application/upload"
            ) {

                const filename =
                    (
                        req.file.originalname || ""
                    ).toLowerCase();


                if (
                    filename.endsWith(".ogg") ||
                    filename.endsWith(".opus")
                ) {

                    mimeType = "audio/ogg";

                } else if (
                    filename.endsWith(".mp3")
                ) {

                    mimeType = "audio/mpeg";

                } else if (
                    filename.endsWith(".wav")
                ) {

                    mimeType = "audio/wav";

                } else if (
                    filename.endsWith(".m4a") ||
                    filename.endsWith(".mp4")
                ) {

                    mimeType = "audio/mp4";

                } else if (
                    filename.endsWith(".webm")
                ) {

                    mimeType = "audio/webm";

                } else {

                    mimeType = "audio/ogg";
                }
            }


            console.log(
                "Audio file:",
                req.file.originalname
            );

            console.log(
                "MIME:",
                mimeType
            );

            console.log(
                "Size:",
                req.file.size
            );


            // ========================================
            // STEP 1 — UPLOAD AUDIO TO GEMINI
            // ========================================

            const uploadResponse = await fetch(
                "https://generativelanguage.googleapis.com/upload/v1beta/files",
                {
                    method: "POST",

                    headers: {
                        "x-goog-api-key":
                            GEMINI_API_KEY,

                        "Content-Type":
                            mimeType,

                        "X-Goog-Upload-Protocol":
                            "raw",

                        "X-Goog-Upload-File-Name":
                            req.file.originalname ||
                            "voice"
                    },

                    body:
                        req.file.buffer
                }
            );


            const uploadText =
                await uploadResponse.text();


            console.log(
                "Gemini upload response:",
                uploadText
            );


            if (!uploadResponse.ok) {

                return res.status(500).json({
                    error:
                        "Gemini audio upload failed.",

                    details:
                        uploadText
                });
            }


            let uploaded;

            try {

                uploaded =
                    JSON.parse(uploadText);

            } catch {

                return res.status(500).json({
                    error:
                        "Invalid response from Gemini upload.",

                    details:
                        uploadText
                });
            }


            const file =
                uploaded?.file;


            if (!file?.uri) {

                return res.status(500).json({
                    error:
                        "Gemini did not return a file URI.",

                    raw:
                        uploaded
                });
            }


            console.log(
                "Gemini file URI:",
                file.uri
            );


            // ========================================
            // STEP 2 — TRANSCRIPTION
            // ========================================

            const requestBody = {

                model:
                    "gemini-3.5-transcribe",

                input: [

                    {
                        type:
                            "audio",

                        uri:
                            file.uri,

                        mime_type:
                            file.mimeType ||
                            mimeType
                    }
                ]
            };


            console.log(
                "Transcription request:",
                JSON.stringify(
                    requestBody
                )
            );


            const transcriptionResponse =
                await fetch(
                    "https://generativelanguage.googleapis.com/v1beta/interactions",
                    {
                        method: "POST",

                        headers: {
                            "x-goog-api-key":
                                GEMINI_API_KEY,

                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify(
                                requestBody
                            )
                    }
                );


            const transcriptionText =
                await transcriptionResponse.text();


            console.log(
                "Gemini transcription response:",
                transcriptionText
            );


            if (!transcriptionResponse.ok) {

                return res.status(500).json({
                    error:
                        "Gemini transcription failed.",

                    details:
                        transcriptionText
                });
            }


            let result;

            try {

                result =
                    JSON.parse(
                        transcriptionText
                    );

            } catch {

                return res.status(500).json({
                    error:
                        "Invalid transcription response.",

                    details:
                        transcriptionText
                });
            }


            // ========================================
            // GET TRANSCRIPTION
            // ========================================

            let text =
                result?.output_text ||
                "";


            /*
             * Fallback for structured responses.
             */

            if (
                !text &&
                Array.isArray(
                    result?.outputs
                )
            ) {

                for (
                    const output
                    of result.outputs
                ) {

                    if (
                        typeof output?.text ===
                        "string"
                    ) {

                        text +=
                            output.text;
                    }


                    if (
                        Array.isArray(
                            output?.content
                        )
                    ) {

                        for (
                            const content
                            of output.content
                        ) {

                            if (
                                typeof content?.text ===
                                "string"
                            ) {

                                text +=
                                    content.text;
                            }
                        }
                    }
                }
            }


            text =
                text.trim();


            // ========================================
            // EMPTY RESULT
            // ========================================

            if (!text) {

                return res.status(500).json({

                    error:
                        "Gemini returned empty transcription.",

                    raw:
                        result
                });
            }


            // ========================================
            // SUCCESS
            // ========================================

            console.log(
                "FINAL TRANSCRIPTION:",
                text
            );


            return res.json({

                success:
                    true,

                text:
                    text
            });


        } catch (error) {

            console.error(
                "SERVER ERROR:",
                error
            );


            return res.status(500).json({

                error:
                    "Unexpected server error.",

                details:
                    error.message
            });
        }
    }
);


// ============================================
// START SERVER
// ============================================

app.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log(
            `AMZ Ops Translate running on port ${PORT}`
        );
    }
);
