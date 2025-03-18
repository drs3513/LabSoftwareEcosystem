import { NextRequest, NextResponse } from "next/server";
import { S3Client, ListObjectVersionsCommand } from "@aws-sdk/client-s3";

const BUCKET_NAME = "amplify-awsamplifygen2-da-filestorage142024bucket6-ffnkcarhx9vc";
const REGION = "us-east-1";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { credentials, key } = body;

    if (!credentials) {
      console.error("No credentials provided.");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!key) {
      console.error("No key provided.");
      return NextResponse.json({ error: "Missing key parameter" }, { status: 400 });
    }

    const s3Client = new S3Client({
      region: REGION,
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
        sessionToken: credentials.sessionToken,
      },
    });

    const command = new ListObjectVersionsCommand({
      Bucket: BUCKET_NAME,
      Prefix: key, // Dynamically uses key from request
    });

    const response = await s3Client.send(command);
    const versions = response.Versions?.map((v) => ({
      key: v.Key,
      versionId: v.VersionId,
      lastModified: v.LastModified,
    })) || [];

    return NextResponse.json({ versions }, { status: 200 });
  } catch (error) {
    console.error("Error fetching versions:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
