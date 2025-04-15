import { S3Event } from "aws-lambda";
import { S3Client, HeadObjectCommand, ListObjectVersionsCommand } from "@aws-sdk/client-s3";
import { generateClient } from "aws-amplify/data";
import { Schema } from "../../../data/resource";
import { v4 as uuidv4 } from "uuid";

const s3 = new S3Client({});
const client = generateClient<Schema>();

export const handler = async (/*event: S3Event*/) => {
  return;
  //Not needed for now, could come back to lessen front end work. 
  for (const record of event.Records) {
    try {
      const bucket = record.s3.bucket.name;
      const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));

      const head = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
      const meta = head.Metadata ?? {};

      const filename = meta.filename;
      const filepath = meta.filepath;
      const logicalId = meta.logicalid;
      const parentId = meta.parentid;
      const ownerId = meta.ownerid;
      const projectId = meta.projectid;
      const mode = meta.mode;
      const size = head.ContentLength ?? 0;
      var versionId: string |undefined;
      const versionResp = await s3.send(new ListObjectVersionsCommand({ Bucket: bucket, Prefix: key }));
      if(versionResp){
         versionId = versionResp?.Versions?.find(v => v.Key === key)?.VersionId;
      }
        
      
      if (!filename || !filepath || !versionId || !logicalId || !ownerId || !projectId || !mode) {
        console.warn(`[SKIP] Missing metadata`);
        continue;
      }

      if (mode === "create" || mode === "version") {
        const fileId = uuidv4();
        const now = new Date().toISOString();
        await client.models.File.create({
          fileId,
          logicalId,
          filename,
          filepath,
          size,
          versionId,
          ownerId,
          projectId,
          createdAt: now,
          updatedAt: now,
          isDeleted: false,
          parentId,
          isDirectory: false,
        });
        console.log(`[✓] Created ${mode} entry for: ${filename}`);
      }

      if (mode === "overwrite") {
        const existing = await client.models.File.list({
          filter: {
            logicalId: { eq: logicalId },
            projectId: { eq: projectId },
            filepath: { eq: filepath },
          },
        });
        
        const latest = existing.data?.sort((a, b) => 
          new Date(b.updatedAt!).getTime() - new Date(a.updatedAt!).getTime()
        )[0];
        if (!latest) {
          console.warn(`[WARN] Overwrite failed, no existing entry`);
          continue;
        }

        await client.models.File.update({
           fileId: latest.fileId, 
           projectId: latest.projectId,
          versionId,
          size,
          updatedAt: new Date().toISOString(),
        });
        console.log(`[✓] Overwrote file: ${latest.filename}`);
      }
    } catch (err) {
      console.error(`[✗] Trigger failed:`, err);
    }
  }
};
