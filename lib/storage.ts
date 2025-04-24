import {downloadData, isCancelError, remove, uploadData} from "aws-amplify/storage";
//import {S3Client} from "@aws-sdk/client-s3";
import {fetchAuthSession} from "aws-amplify/auth";
import JSZip from "jszip";

//const s3Client = new S3Client({ region: "us-east-1" });

export async function getFileVersions(key: string): Promise<string | null> {
  const maxRetries = 3;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`[INFO] Fetching file versions (Attempt ${attempt}/${maxRetries})`);

    const session = await fetchAuthSession();
    if (!session?.credentials) {
      console.warn("[WARN] Missing or invalid credentials.");
      continue;
    }

    try {
      const response = await fetch("/api/s3-versions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credentials: session.credentials, key }),
      });

      if (!response.ok) {
        console.warn(`[WARN] Response failed: ${response.status} ${response.statusText}`);
        continue;
      }

      const data = await response.json();
      const versions = (data.versions || []).filter((v: any) => v.key === key);

      if (versions.length === 0) {
        console.warn(`[WARN] No versions found for key: ${key}`);
        continue;
      }

      versions.sort((a: any, b: any) =>
        new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
      );

      const versionId = versions[0].versionId;
      console.log(versions);
      if (versionId) {
        console.log(`[SUCCESS] Retrieved latest version: ${versionId}`);
        return versionId;
      } else {
        console.warn(`[WARN] Latest version entry missing versionId`);
      }
    } catch (err) {
      console.error(`[ERROR] Fetching version failed on attempt ${attempt}:`, err);
    }

    const delay = Math.pow(2, attempt) * 100;
    console.log(`[INFO] Retrying in ${delay}ms...`);
    await new Promise(res => setTimeout(res, delay));
  }

  console.error(`[FATAL] Could not retrieve versionId for key: ${key}`);
  return null;
}



// Upload file and return S3 key
export async function uploadFile(
    file: File,
    userId: string,
    projectId: string,
    filePath: string
): Promise<{ key: string }> {
  try {
    const key = `uploads/${userId}/${projectId}${filePath}`;
    const fileReader = new FileReader();
    console.log("KEY: ", key);

    return new Promise((resolve, reject) => {
      fileReader.onload = async (event) => {
        try {
          //console.log(event)
          // Upload the file
          uploadData({
            data: event.target?.result as ArrayBuffer,
            path: key,
            options: {
              contentType: file.type,
              bucket: "filestorage142024", // Specify target bucket
            },
          });
          resolve({ key });
        } catch (error) {
          console.error("Error uploading file:", error);
          reject(error);
        }
      };

      fileReader.onerror = (error) => {
        console.error("File reading error:", error);
        reject(error);
      };

      fileReader.readAsArrayBuffer(file);
    });
  } catch (error) {
    console.error("Error starting upload:", error);
    throw error;
  }
}


export type ZipTask = {
  cancel: () => void;
  isCanceled: boolean;
};

export async function downloadFolderAsZip(
  folderName: string,
  fileList: { filepath: string; storageId: string }[],
  task: ZipTask
) {
  const zip = new JSZip();

  for (const file of fileList) {
    if (task.isCanceled) {
      console.warn("[CANCEL] Folder download canceled.");
      return;
    }

    try {
      const { body } = await downloadData({
        path: file.storageId,
      }).result;
      //console.log(body)
      const blob = await body.blob();

      // Add to zip under the desired directory structure
      zip.file(file.filepath.replace(/^\//, ""), blob);
    } catch (error) {
      if (isCancelError(error)) {
        console.warn(`[CANCELLED] ${file.filepath}`);
        return;
      } else {
        console.error(`[ERROR] Failed to download storageId: ${file.storageId}`, error);
      }
    }
  }

  if (task.isCanceled) return;

  const zipBlob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(zipBlob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${folderName}.zip`;
  a.click();
  URL.revokeObjectURL(url);
}

export function startDownloadTask(fileKey: string, onProgress: (percent: number) => void) {
  return downloadData({
    path: fileKey,
    options: {
      onProgress: (progress) => {
        if (progress.totalBytes && progress.totalBytes > 0) {
          const percent = (progress.transferredBytes / progress.totalBytes) * 100;
          onProgress(percent);
        } else {
          // If totalBytes is undefined or 0, fallback to indeterminate progress (optional)
          onProgress(0);
        }
      }
    }
  });
}


export async function deleteFileFromStorage(fileKey: string): Promise<void> {
  try {
    await remove({ path: fileKey });
    //console.log(`File deleted: ${fileKey}`);
  } catch (error) {
    console.error("Error deleting file:", error);
    throw error;
  }
}
