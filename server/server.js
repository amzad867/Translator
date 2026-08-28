import express from "express";
import multer from "multer";
import cors from "cors";
import { GoogleGenAI } from "@google/genai";

const app = express();

const PORT = process.env.PORT || 10000;

const API_KEY =
    process.env.GEMINI_API_KEY;


/* ============================================
   CORS
============================================ */

app.use(cors());


/* ============================================
   HEALTH CHECK
============================================ */

app.get("/", (req, res) => {

    res.json({
        status: "ok",
        service: "AMZ Ops Translate",
        model: "gemini-3.5-transcribe"
    });

});


/* ============================================
   MULTER
============================================ */

const upload =
    multer({

        storage:
            multer.memoryStorage(),

        limits: {

            fileSize:
                50 * 1024 * 1024

        }

    });


/* ============================================
   GEMINI CLIENT
============================================ */

const ai =
    API_KEY
        ? new GoogleGenAI({
            apiKey: API_KEY
        })
        : null;


/* ============================================
   TRANSCRIBE
============================================ */

app.post(
    "/transcribe",
    upload.single("audio"),

    async (req, res) => {

        try {

            /* -------------------------------
               API KEY
            -------------------------------- */

            if (!API_KEY) {

                return res.status(500).json({

                    error:
                        "GEMINI_API_KEY is not configured on the server."

                });

            }


            /* -------------------------------
               AUDIO
            -------------------------------- */

            if (!req.file) {

                return res.status(400).json({

                    error:
                        "No audio file received."

                });

            }


            console.log(
                "Received:",
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


            /* =================================
               STEP 1
               UPLOAD USING GOOGLE SDK
            ================================= */

            const audioFile =
                await ai.files.upload({

                    file:
                        new Blob(
                            [
                                req.file.buffer
                            ],
                            {
                                type:
                                    req.file.mimetype ||
                                    "audio/ogg"
                            }
                        ),

                    config: {

                        mimeType:
                            req.file.mimetype ||
                            "audio/ogg"

                    }

                });


            console.log(
                "Uploaded Gemini file:",
                audioFile.uri
            );


            if (!audioFile.uri) {

                return res.status(500).json({

                    error:
                        "Gemini upload did not return a file URI."

                });

            }


            /* =================================
               STEP 2
               TRANSCRIBE
            ================================= */

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
                                audioFile.mimeType

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


            console.log(
                "Interaction received."
            );


            console.log(
                "Output:",
                interaction.output_text
            );


            /* =================================
               RESULT
            ================================= */

            const text =
                (
                    interaction.output_text ||
                    ""
                ).trim();


            if (!text) {

                return res.status(500).json({

                    error:
                        "Gemini returned empty transcription.",

                    raw:
                        interaction

                });

            }


            /* =================================
               SUCCESS
            ================================= */

            return res.json({

                success:
                    true,

                text:
                    text

            });


        }

        catch (error) {

            console.error(
                "TRANSCRIPTION ERROR:",
                error
            );


            return res.status(500).json({

                error:
                    "Gemini transcription failed.",

                details:
                    error.message

            });

        }

    }
);


/* ============================================
   START
============================================ */

app.listen(

    PORT,

    "0.0.0.0",

    () => {

        console.log(
            `AMZ Ops Translate running on port ${PORT}`
        );

    }

);
