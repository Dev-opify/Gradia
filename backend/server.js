import express from "express";
import multer from "multer";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { uploadToR2 } from "./r2.js";

dotenv.config();

const app = express();
const upload = multer();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health
app.get("/health", (_, res) => res.json({ ok: true }));

// Upload PDF -> R2
app.post("/upload", upload.single("resume"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Missing resume file" });
    const { uid } = req.body;
    const original = req.file.originalname || "resume.pdf";
    const sanitized = original.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    const key = `resumes/${uid}/${Date.now()}_${sanitized}`;

    const url = await uploadToR2({
      key,
      contentType: "application/pdf",
      body: req.file.buffer,
    });

    return res.json({ resumeUrl: url, key });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Upload failed" });
  }
});

// Optional: proxy to a free ATS API if user configures one (fallback done on client)
app.post("/ats-score", async (req, res) => {
  // This is a placeholder that simply echoes an error unless ATS_API_URL is configured.
  try {
    const ATS_API_URL = process.env.ATS_API_URL; // e.g., a free scoring endpoint if available
    if (!ATS_API_URL) {
      return res.status(501).json({ error: "No external ATS API configured" });
    }
    // If you configure ATS_API_URL, you can forward req.body there.
    // Keeping implementation minimal for now.
    return res.status(200).json({ message: "ATS API configured, implement forwarding here." });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "ATS proxy failed" });
  }
});

// Serve frontend for local dev (optional)
app.use("/", express.static(path.resolve("./frontend")));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Backend running on :${PORT}`));
