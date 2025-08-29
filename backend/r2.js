import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

import dotenv from "dotenv";
dotenv.config();
// import { fileURLToPath } from "url";
// import { dirname, join } from "path";

// const __dirname = dirname(fileURLToPath(import.meta.url));
// dotenv.config({ path: join(__dirname, ".env") }); // ✅ force load


const ACCOUNT_ID = process.env.R2_ACCOUNT_ID; // Cloudflare Account ID
const ENDPOINT = `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`;
const BUCKET = process.env.R2_BUCKET;
const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const PUBLIC_BUCKET_URL = process.env.R2_PUBLIC_BUCKET_URL; 
// If you have a public bucket or a custom domain, you can set R2_PUBLIC_BUCKET_URL


if (!ACCOUNT_ID || !BUCKET || !ACCESS_KEY_ID || !SECRET_ACCESS_KEY) {
  console.warn("[R2] Missing environment variables. Please set R2_ACCOUNT_ID, R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY");
}

const r2 = new S3Client({
  region: "auto",
  endpoint: ENDPOINT,
  credentials: {
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY,
  },
});

export async function uploadToR2({ key, contentType, body }) {
  const cmd = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType || "application/octet-stream",
  });
  await r2.send(cmd);
  // Construct a public URL if the bucket/object is public, or you front it with a domain
  return `${PUBLIC_BUCKET_URL}/${key}`;
}
