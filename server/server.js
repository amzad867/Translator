import express from "express";
import multer from "multer";
import cors from "cors";

const app = express();

const PORT = process.env.PORT || 10000;

const GEMINI_API_KEY =
    process.env.GEMINI_API_KEY;

app.use(cors());

app.get("/", (req, res) => {
    res.json({
        status: "ok",
        service: "AMZ Ops Translate",
        model: "gemini-3.5-transcribe"
    });
});


const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 50 * 1024 * 1024
    }
});


app.post(
    "/transcribe",
    upload.single("audio"),
    async (req, res) => {

        try {

            if (!GEMINI_API_KEY) {

                return res.status(500).json({
                    error:
                        "GEMINI_API_KEY is not configured on the server."
                });
            }


            if (!req.file) {

                return res.status(400).json({
                    error:
                        "No audio file received."
                });
            }


            /*
             * Get the real MIME type
             */

            let mimeType =
                req.file.mimetype;


            /*
             * Some browsers/Acode may send
             * an unusual MIME type.
             */

            if (
                !mimeType ||
                mimeType === "application/octet-stream"
            ) {

                const name =
                    (
                        req.file.originalname ||
                        ""
                    ).toLowerCase();


                if (
                    name.endsWith(".ogg") ||
                    name.endsWith(".opus")
                ) {

                    mimeType =
                        "audio/ogg";

                } else if (
                    name.endsWith(".mp3")
                ) {

                    mimeType =
                        "audio/mpeg";

                } else if (
                    name.endsWith(".wav")
                ) {

                    mimeType =
                        "audio/wav";

                } else if (
                    name.endsWith(".m4a") ||
                    name.endsWith(".mp4")
                ) {

                    mimeType =
                        "audio/mp4";

                } else if (
                    name.endsWith(".webm")
                ) {

                    mimeType =
                        "audio/webm";

                } else {

                    mimeType =
                        "audio/ogg";
                }
            }


            console.log(
                "Audio:",
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


            /*
             * =========================================
             * GEMINI FILE UPLOAD
             * =========================================
             *
             * IMPORTANT:
             *
             * Content-Type must be the actual
             * audio MIME type.
             */

            const uploadResponse =
                await fetch(
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


            if (!uploadResponse.ok) {

                const errorText =
                    await uploadResponse.text();

                console.error(
                    "GEMINI UPLOAD ERROR:",
                    errorText
                );

                return res.status(500).json({
                    error:
                        "Gemini audio upload failed.",
                    details:
                        errorText
                });
            }


            const uploaded =
                await uploadResponse.json();


            console.log(
                "Uploaded file:",
                uploaded
            );


            const fileUri =
                uploaded?.file?.uri;


            const uploadedMime =
                uploaded?.file?.mimeType ||
                mimeType;


            if (!fileUri) {

                return res.status(500).json({
                    error:
                        "Gemini did not return a file URI."
                });
            }


            /*
             * =========================================
             * TRANSCRIPTION
             * =========================================
             */

            const interactionResponse =
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
                            JSON.stringify({

                                model:
                                    "gemini-3.5-transcribe",

                                input: [

                                    {
                                        type:
                                            "audio",

                                        uri:
                                            fileUri,

                                        mime_type:
                                            uploadedMime
                                    }
                                ],

                                generation_config: {

                                    transcription_config: {

                                        language_codes: [
                                            "ar-SA",
                                            "ar"
                                        ],

                                        mode: {

                                            type:
                                                "verbatim"
                                        },

                                        custom_vocabulary: [

                                            "ننجا",
                                            "ناينجا",
                                            "مستودع",
                                            "مخزن",
                                            "استلام",
                                            "بضاعة",
                                            "شفت",
                                            "بيكر",
                                            "ريسيفر"
                                        ]
                                    }
                                }
                            })
                    }
                );


            if (!interactionResponse.ok) {

                const errorText =
                    await interactionResponse.text();

                console.error(
                    "GEMINI TRANSCRIPTION ERROR:",
                    errorText
                );

                return res.status(500).json({
                    error:
                        "Gemini transcription failed.",
                    details:
                        errorText
                });
            }


            const result =
                await interactionResponse.json();


            console.log(
                "Gemini result:",
                result
            );


            /*
             * Gemini may return output_text
             * or structured output.
             */

            let text =
                result?.output_text ||
                result?.text ||
                "";


            /*
             * Fallback:
             * Search structured output.
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
                            output.text +
                            "\n";
                    }


                    if (
                        Array.isArray(
                            output?.content
                        )
                    ) {

                        for (
                            const item
                            of output.content
                        ) {

                            if (
                                typeof item?.text ===
                                "string"
                            ) {

                                text +=
                                    item.text +
                                    "\n";
                            }
                        }
                    }
                }
            }


            text =
                text.trim();


            if (!text) {

                return res.status(500).json({
                    error:
                        "Gemini returned empty transcription.",
                    raw:
                        result
                });
            }


            res.json({

                success:
                    true,

                text:
                    text

            });


        }

        catch (error) {

            console.error(
                "SERVER ERROR:",
                error
            );


            res.status(500).json({

                error:
                    "Unexpected server error.",

                details:
                    error.message

            });
        }
    }
);


app.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log(
            `AMZ Ops Translate server running on ${PORT}`
        );
    }
);
