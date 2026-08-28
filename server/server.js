import express from "express";
import multer from "multer";
import cors from "cors";

const app = express();

const PORT = process.env.PORT || 10000;

const GEMINI_API_KEY =
    process.env.GEMINI_API_KEY;


app.use(cors());


/* =========================================
   HOME
========================================= */

app.get("/", (req, res) => {

    res.json({
        status: "ok",
        service: "AMZ Ops Translate",
        model: "gemini-3.5-transcribe"
    });

});


/* =========================================
   UPLOAD
========================================= */

const upload = multer({

    storage:
        multer.memoryStorage(),

    limits: {

        fileSize:
            50 * 1024 * 1024

    }

});


/* =========================================
   TRANSCRIBE
========================================= */

app.post(
    "/transcribe",
    upload.single("audio"),

    async (req, res) => {

        try {

            /* -----------------------------
               API KEY
            ----------------------------- */

            if (!GEMINI_API_KEY) {

                return res.status(500).json({

                    error:
                        "GEMINI_API_KEY is not configured on the server."

                });

            }


            /* -----------------------------
               AUDIO
            ----------------------------- */

            if (!req.file) {

                return res.status(400).json({

                    error:
                        "No audio file received."

                });

            }


            let mimeType =
                req.file.mimetype;


            /*
             * WhatsApp / Android sometimes
             * sends generic MIME types.
             */

            if (
                !mimeType ||
                mimeType ===
                    "application/octet-stream"
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

                }

                else if (
                    filename.endsWith(".mp3")
                ) {

                    mimeType =
                        "audio/mp3";

                }

                else if (
                    filename.endsWith(".wav")
                ) {

                    mimeType =
                        "audio/wav";

                }

                else if (
                    filename.endsWith(".m4a") ||
                    filename.endsWith(".mp4")
                ) {

                    mimeType =
                        "audio/mp4";

                }

                else if (
                    filename.endsWith(".webm")
                ) {

                    mimeType =
                        "audio/webm";

                }

                else {

                    mimeType =
                        "audio/ogg";

                }

            }


            console.log(
                "FILE:",
                req.file.originalname
            );

            console.log(
                "MIME:",
                mimeType
            );

            console.log(
                "SIZE:",
                req.file.size
            );


            /* =================================
               STEP 1
               UPLOAD AUDIO TO GEMINI
            ================================= */

            const uploadResponse =
                await fetch(

                    "https://generativelanguage.googleapis.com/upload/v1beta/files",

                    {

                        method:
                            "POST",

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
                "UPLOAD RESPONSE:",
                uploadText
            );


            if (
                !uploadResponse.ok
            ) {

                return res.status(500).json({

                    error:
                        "Gemini audio upload failed.",

                    details:
                        uploadText

                });

            }


            const uploaded =
                JSON.parse(
                    uploadText
                );


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
                "GEMINI FILE URI:",
                file.uri
            );


            /* =================================
               STEP 2
               TRANSCRIBE
            ================================= */

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
                "TRANSCRIBE REQUEST:",
                JSON.stringify(
                    requestBody
                )
            );


            const transcriptionResponse =
                await fetch(

                    "https://generativelanguage.googleapis.com/v1beta/interactions",

                    {

                        method:
                            "POST",

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
                "TRANSCRIPTION RESPONSE:",
                transcriptionText
            );


            if (
                !transcriptionResponse.ok
            ) {

                return res.status(500).json({

                    error:
                        "Gemini transcription failed.",

                    details:
                        transcriptionText

                });

            }


            const result =
                JSON.parse(
                    transcriptionText
                );


            /* =================================
               OFFICIAL RESPONSE
            ================================= */

            const text =
                result?.output_text ||
                "";


            console.log(
                "OUTPUT TEXT:",
                text
            );


            if (!text.trim()) {

                /*
                 * Do NOT hide the raw response.
                 * We need it if Gemini returns
                 * an unexpected structure.
                 */

                return res.status(500).json({

                    error:
                        "Gemini returned empty transcription.",

                    raw:
                        result

                });

            }


            /* =================================
               SUCCESS
            ================================= */

            return res.json({

                success:
                    true,

                text:
                    text.trim()

            });


        }

        catch (error) {

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


/* =========================================
   START
========================================= */

app.listen(

    PORT,

    "0.0.0.0",

    () => {

        console.log(
            `AMZ Ops Translate running on port ${PORT}`
        );

    }

);            if (
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
