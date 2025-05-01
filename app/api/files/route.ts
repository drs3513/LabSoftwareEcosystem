import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import output from "@/amplify_outputs.json";
import { NextRequest, NextResponse } from "next/server";

const s3 = new S3Client({});
const BUCKET_NAME = output.storage.bucket_name;


/**
 * API endpoint to generate a signed download URL for a specific version of an S3 object.
 * 
 * - Uses AWS S3 and `@aws-sdk/s3-request-presigner` to create a presigned URL
 * - Supports versioned S3 downloads using `VersionId`
 * - Forces the browser to download the file via `Content-Disposition: attachment`
 *
 * @param {NextRequest} req - A Next.js request containing `key` and `versionId` as URL search params.
 * @returns {Promise<NextResponse>} A redirect to the S3 signed URL or a JSON error response.
 *
 * Query Parameters:
 * - `key` (string): The S3 object key (e.g., `uploads/user123/file.txt`)
 * - `versionId` (string): The specific S3 version ID to download
 *
 * Example:
 * ```http
 * GET /api/files?key=uploads/user123/test.txt&versionId=abc123
 * ```
 *
 * Success Response:
 * - 302 Redirect to signed S3 URL
 *
 * Error Responses:
 * - 400 Bad Request: If key or versionId is missing
 * - 500 Internal Server Error: If URL signing fails
 */
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

