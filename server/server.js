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


      const mimeType =
        req.file.mimetype ||
        "audio/webm";


      /*
       * Gemini Files API
       *
       * Step 1:
       * Upload audio.
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
                "application/upload",

              "X-Goog-Upload-Protocol":
                "raw",

              "X-Goog-Upload-File-Name":
                req.file.originalname ||
                "audio"
            },

            body:
              req.file.buffer
          }
        );


      if (!uploadResponse.ok) {

        const errorText =
          await uploadResponse.text();

        console.error(
          "UPLOAD ERROR:",
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
       * Step 2:
       * Ask Gemini 3.5 Transcribe
       * for VERBATIM Arabic transcription.
       *
       * We specifically tell it:
       * DO NOT translate.
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

            body: JSON.stringify({

              model:
                "gemini-3.5-transcribe",

              input: [

                {
                  type: "audio",

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
          "TRANSCRIBE ERROR:",
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


      /*
       * Gemini returns output_text.
       */

      const text =
        result?.output_text ||
        result?.text ||
        "";


      if (!text.trim()) {

        return res.status(500).json({
          error:
            "Gemini returned empty transcription."
        });
      }


      res.json({
        success: true,
        text: text.trim()
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
