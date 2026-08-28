import express from "express";
import multer from "multer";
import cors from "cors";
import { GoogleGenAI } from "@google/genai";

const app = express();

const PORT = process.env.PORT || 10000;

const GEMINI_API_KEY =
    process.env.GEMINI_API_KEY;


// ============================================
// CORS
// ============================================

app.use(cors());


// ============================================
// HEALTH CHECK
// ============================================

app.get("/", (req, res) => {

    res.json({

        status: "ok",

        service:
            "AMZ Ops Translate",

        model:
            "gemini-3.5-transcribe"

    });

});


// ============================================
// MULTER
// ============================================

const upload =
    multer({

        storage:
            multer.memoryStorage(),

        limits: {

            fileSize:
                50 * 1024 * 1024

        }

    });


// ============================================
// GEMINI
// ============================================

const ai =
    new GoogleGenAI({

        apiKey:
            GEMINI_API_KEY

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
            // CHECK API KEY
            // --------------------------------

            if (!GEMINI_API_KEY) {

                return res.status(500).json({

                    error:
                        "GEMINI_API_KEY is not configured on the server."

                });

            }


            // --------------------------------
            // CHECK AUDIO
            // --------------------------------

            if (!req.file) {

                return res.status(400).json({

                    error:
                        "No audio file received."

                });

            }


            console.log(
                "================================"
            );

            console.log(
                "NEW TRANSCRIPTION REQUEST"
            );

            console.log(
                "File:",
                req.file.originalname
            );

            console.log(
                "MIME:",
                req.file.mimetype
            );

            console.log(
                "Size:",
                req.file.size
            );


            // ========================================
            // DETERMINE MIME TYPE
            // ========================================

            let mimeType =
                req.file.mimetype;


            if (
                !mimeType ||
                mimeType ===
                    "application/octet-stream" ||
                mimeType ===
                    "application/upload"
            ) {

                const filename =
                    (
                        req.file.originalname ||
                        ""
                    ).toLowerCase();


                if (
                    filename.endsWith(".ogg") ||
                    filename.endsWith(".opus")
                ) {

                    mimeType =
                        "audio/ogg";

                } else if (
                    filename.endsWith(".mp3")
                ) {

                    mimeType =
                        "audio/mpeg";

                } else if (
                    filename.endsWith(".wav")
                ) {

                    mimeType =
                        "audio/wav";

                } else if (
                    filename.endsWith(".m4a") ||
                    filename.endsWith(".mp4")
                ) {

                    mimeType =
                        "audio/mp4";

                } else if (
                    filename.endsWith(".webm")
                ) {

                    mimeType =
                        "audio/webm";

                } else {

                    mimeType =
                        "audio/ogg";

                }

            }


            console.log(
                "Using MIME:",
                mimeType
            );


            // ========================================
            // UPLOAD AUDIO TO GEMINI
            // ========================================

            console.log(
                "Uploading audio to Gemini..."
            );


            const audioFile =
                await ai.files.upload({

                    file:
                        new Blob(

                            [
                                req.file.buffer
                            ],

                            {
                                type:
                                    mimeType
                            }

                        ),

                    config: {

                        mimeType:
                            mimeType

                    }

                });


            console.log(
                "Gemini file uploaded:"
            );

            console.log(
                audioFile
            );


            if (
                !audioFile ||
                !audioFile.uri
            ) {

                return res.status(500).json({

                    error:
                        "Gemini upload did not return a file URI.",

                    raw:
                        audioFile

                });

            }


            // ========================================
            // TRANSCRIBE WITH GEMINI
            // ========================================

            console.log(
                "Starting Gemini transcription..."
            );


            const interaction =
                await ai.interactions.create({

                    model:
                        "gemini-3.5-transcribe",

                    input: [

                        {

                            type:
                                "audio",

                            uri:
                                audioFile.uri,

                            mime_type:
                                audioFile.mimeType ||
                                mimeType

                        }

                    ],

                    generation_config: {

                        transcription_config: {

                            language_codes: [

                                "ar-SA"

                            ],

                            mode: {

                                type:
                                    "verbatim"

                            }

                        }

                    }

                });


            // ========================================
            // LOG COMPLETE RESPONSE
            // ========================================

            console.log(
                "Gemini interaction completed."
            );

            console.log(
                JSON.stringify(
                    interaction,
                    null,
                    2
                )
            );


            // ========================================
            // EXTRACT TEXT
            // ========================================

            let text =
                interaction?.output_text ||
                "";


            /*
             * Gemini Transcribe response can
             * contain the transcript here:
             *
             * steps[]
             *   content[]
             *      text
             */

            if (
                !text.trim() &&
                Array.isArray(
                    interaction?.steps
                )
            ) {

                for (
                    const step
                    of interaction.steps
                ) {

                    if (
                        !Array.isArray(
                            step?.content
                        )
                    ) {

                        continue;

                    }


                    for (
                        const item
                        of step.content
                    ) {

                        if (
                            item?.type ===
                                "text" &&

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


            text =
                text.trim();


            console.log(
                "FINAL TEXT:"
            );

            console.log(
                text
            );


            // ========================================
            // EMPTY RESULT
            // ========================================

            if (!text) {

                return res.status(500).json({

                    error:
                        "Gemini returned empty transcription.",

                    raw:
                        interaction

                });

            }


            // ========================================
            // SUCCESS
            // ========================================

            return res.json({

                success:
                    true,

                text:
                    text

            });

        }


        catch (error) {

            console.error(
                "================================"
            );

            console.error(
                "GEMINI ERROR"
            );

            console.error(
                error
            );

            console.error(
                "================================"
            );


            return res.status(500).json({

                error:
                    "Gemini transcription failed.",

                details:
                    error?.message ||
                    String(error)

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
            "================================"
        );

        console.log(
            "AMZ OPS TRANSLATE SERVER"
        );

        console.log(
            `Running on port ${PORT}`
        );

        console.log(
            "Model: gemini-3.5-transcribe"
        );

        console.log(
            "================================"
        );

    }

);
