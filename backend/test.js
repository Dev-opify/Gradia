// test.js
import fs from "fs";
import path from "path";

const filePath = path.resolve("./resume.pdf");

async function uploadFile() {
  try {
    const form = new FormData();
    const buffer = fs.readFileSync(filePath);
    const blob = new Blob([buffer], { type: "application/pdf" });
    form.append("resume", blob, "resume.pdf");

    const res = await fetch("http://localhost:3000/upload", {
      method: "POST",
      body: form,
    });

    const text = await res.text(); // capture raw response
    console.log("Raw response:", text);

    try {
      const data = JSON.parse(text);
      console.log("✅ Parsed JSON:", data);
    } catch {
      console.error("❌ Response was not JSON, see above raw response.");
    }
  } catch (err) {
    console.error("❌ Upload failed:", err);
  }
}

uploadFile();
