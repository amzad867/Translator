import express from "express";
import multer from "multer";
import cors from "cors";

const app = express();

const PORT =
    process.env.PORT || 10000;

const GEMINI_API_KEY =
    process.env.GEMINI_API_KEY;


// ==================================================
// CORS
// ==================================================

app.use(cors());


// ==================================================
// HEALTH CHECK
// ==================================================

app.get("/", (req, res) => {

    res.json({

        status:
            "ok",

        service:
            "AMZ Ops Translate",

        model:
            "gemini-3.5-transcribe"

    });

});


// ==================================================
// MULTER
// ==================================================

const upload =
    multer({

        storage:
            multer.memoryStorage(),

        limits: {

            fileSize:
                50 * 1024 * 1024

        }

    });


// ==================================================
// GET MIME TYPE
// ==================================================

function getMimeType(
    file
) {

    let mime =
        file.mimetype;


    /*
     * Browser / Android sometimes
     * sends generic MIME types.
     */

    if (
        !mime ||
        mime ===
            "application/octet-stream" ||
        mime ===
            "application/upload"
    ) {

        const filename =
            (
                file.originalname ||
                ""
            ).toLowerCase();


        if (
            filename.endsWith(".ogg") ||
            filename.endsWith(".opus")
        ) {

            return "audio/ogg";

        }


        if (
            filename.endsWith(".mp3")
        ) {

            return "audio/mpeg";

        }


        if (
            filename.endsWith(".wav")
        ) {

            return "audio/wav";

        }


        if (
            filename.endsWith(".m4a") ||
            filename.endsWith(".mp4")
        ) {

            return "audio/mp4";

        }


        if (
            filename.endsWith(".webm")
        ) {

            return "audio/webm";

        }


        return "audio/ogg";
    }


    return mime;
}


// ==================================================
// EXTRACT TRANSCRIPTION
// ==================================================

function extractTranscript(
    data
) {

    /*
     * ----------------------------------------------
     * 1. Direct output_text
     * ----------------------------------------------
     */

    if (
        typeof data?.output_text ===
        "string" &&
        data.output_text.trim()
    ) {

        return data.output_text.trim();

    }


    /*
     * ----------------------------------------------
     * 2. steps[].content[].text
     *
     * This is the format shown in your
     * actual Gemini response.
     * ----------------------------------------------
     */

    let result = "";


    if (
        Array.isArray(
            data?.steps
        )
    ) {

        for (
            const step
            of data.steps
        ) {

            if (
                !Array.isArray(
                    step?.content
                )
            ) {

                continue;

            }


            for (
                const content
                of step.content
            ) {

                if (
                    typeof content?.text ===
                    "string"
                ) {

                    result +=
                        content.text +
                        "\n";

                }

            }

        }

    }


    /*
     * ----------------------------------------------
     * 3. outputs[].text
     * ----------------------------------------------
     */

    if (
        !result.trim() &&
        Array.isArray(
            data?.outputs
        )
    ) {

        for (
            const output
            of data.outputs
        ) {

            if (
                typeof output?.text ===
                "string"
            ) {

                result +=
                    output.text +
                    "\n";

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

                        result +=
                            content.text +
                            "\n";

                    }

                }

            }

        }

    }


    return result.trim();
}


// ==================================================
// TRANSCRIBE ENDPOINT
// ==================================================

app.post(

    "/transcribe",

    upload.single("audio"),

    async (req, res) => {

        try {

            // ======================================
            // API KEY
            // ======================================

            if (
                !GEMINI_API_KEY
            ) {

                return res.status(500).json({

                    error:
                        "GEMINI_API_KEY is not configured on the server."

                });

            }


            // ======================================
            // AUDIO
            // ======================================

            if (
                !req.file
            ) {

                return res.status(400).json({

                    error:
                        "No audio file received."

                });

            }


            const mimeType =
                getMimeType(
                    req.file
                );


            console.log(
                "=========================================="
            );

            console.log(
                "NEW TRANSCRIPTION REQUEST"
            );

            console.log(
                "File:",
                req.file.originalname
            );

            console.log(
                "Original MIME:",
                req.file.mimetype
            );

            console.log(
                "Using MIME:",
                mimeType
            );

            console.log(
                "Size:",
                req.file.size
            );

            console.log(
                "=========================================="
            );


            // ======================================
            // STEP 1
            // UPLOAD AUDIO TO GEMINI FILES API
            // ======================================

            console.log(
                "Uploading audio to Gemini..."
            );


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


            const uploadRaw =
                await uploadResponse.text();


            console.log(
                "Gemini upload response:"
            );

            console.log(
                uploadRaw
            );


            if (
                !uploadResponse.ok
            ) {

                return res.status(500).json({

                    error:
                        "Gemini audio upload failed.",

                    details:
                        uploadRaw

                });

            }


            let uploadData;


            try {

                uploadData =
                    JSON.parse(
                        uploadRaw
                    );

            }

            catch {

                return res.status(500).json({

                    error:
                        "Gemini returned invalid upload response.",

                    details:
                        uploadRaw

                });

            }


            const fileUri =
                uploadData?.file?.uri;


            const fileMimeType =
                uploadData?.file?.mimeType ||
                mimeType;


            if (
                !fileUri
            ) {

                return res.status(500).json({

                    error:
                        "Gemini did not return a file URI.",

                    raw:
                        uploadData

                });

            }


            console.log(
                "Gemini File URI:",
                fileUri
            );

            console.log(
                "Gemini File MIME:",
                fileMimeType
            );


            // ======================================
            // STEP 2
            // INTERACTIONS API
            // ======================================

            console.log(
                "Starting Gemini transcription..."
            );


            const requestBody = {

                model:
                    "gemini-3.5-transcribe",

                input: [

                    {

                        type:
                            "audio",

                        uri:
                            fileUri,

                        mime_type:
                            fileMimeType

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

            };


            console.log(
                "Transcription request:"
            );

            console.log(
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


            const transcriptionRaw =
                await transcriptionResponse.text();


            console.log(
                "=========================================="
            );

            console.log(
                "Gemini transcription response:"
            );

            console.log(
                transcriptionRaw
            );

            console.log(
                "=========================================="
            );


            // ======================================
            // GEMINI ERROR
            // ======================================

            if (
                !transcriptionResponse.ok
            ) {

                return res.status(500).json({

                    error:
                        "Gemini transcription failed.",

                    details:
                        transcriptionRaw

                });

            }


            // ======================================
            // PARSE RESPONSE
            // ======================================

            let transcriptionData;


            try {

                transcriptionData =
                    JSON.parse(
                        transcriptionRaw
                    );

            }

            catch {

                return res.status(500).json({

                    error:
                        "Gemini returned invalid transcription response.",

                    details:
                        transcriptionRaw

                });

            }


            // ======================================
            // EXTRACT TEXT
            // ======================================

            const text =
                extractTranscript(
                    transcriptionData
                );


            console.log(
                "FINAL TRANSCRIPTION:"
            );

            console.log(
                text
            );


            // ======================================
            // EMPTY RESULT
            // ======================================

            if (
                !text
            ) {

                return res.status(500).json({

                    error:
                        "Gemini returned empty transcription.",

                    raw:
                        transcriptionData

                });

            }


            // ======================================
            // SUCCESS
            // ======================================

            console.log(
                "TRANSCRIPTION SUCCESS"
            );


            return res.json({

                success:
                    true,

                text:
                    text

            });

        }


        catch (error) {

            console.error(
                "=========================================="
            );

            console.error(
                "SERVER ERROR"
            );

            console.error(
                error
            );

            console.error(
                "=========================================="
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


// ==================================================
// START SERVER
// ==================================================

app.listen(

    PORT,

    "0.0.0.0",

    () => {

        console.log(
            "=========================================="
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
            "=========================================="
        );

    }

);
