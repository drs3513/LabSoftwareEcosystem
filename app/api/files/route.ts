import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import output from "@/amplify_outputs.json";
import { NextRequest, NextResponse } from "next/server";

const s3 = new S3Client({});
const BUCKET_NAME = output.storage.bucket_name;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");
  const versionId = searchParams.get("versionId");

  if (!key || !versionId) {
    return NextResponse.json({ error: "Missing key or versionId" }, { status: 400 });
  }

  const filename = key.split("/").pop(); // get the original filename

  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      VersionId: versionId,
      ResponseContentDisposition: `attachment; filename="${filename}"`, // This tells S3 to force download
    });

    const signedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });

    return NextResponse.redirect(signedUrl, 302);
  } catch (err) {
    console.error("[ERROR] Failed to generate signed URL:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

