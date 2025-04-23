import { uploadData, getUrl, remove, downloadData, getProperties, isCancelError } from "aws-amplify/storage";
import { S3Client} from "@aws-sdk/client-s3";
import { fetchAuthSession } from "aws-amplify/auth";
import JSZip from "jszip";
const s3Client = new S3Client({ region: "us-east-1" });

export async function getFileVersions(key: string): Promise<string | null> {
  const maxRetries = 1;
  let attempt = 0;

  while (attempt < maxRetries) {
    console.log(`[INFO] Fetching file versions (Attempt ${attempt + 1}/${maxRetries})`);

    try {
      const session = await fetchAuthSession();

      if (!session || !session.credentials) {
        throw new Error("No valid credentials found");
      }

      const response = await fetch("/api/s3-versions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credentials: session.credentials, key }),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const versions = (data.versions || []).filter((v: any) => v.key === key);

      if (versions.length === 0) {
        console.warn(`[WARN] No versions found for key: ${key}`);
        throw new Error("No versions found");
      }

      versions.sort((a: any, b: any) =>
        new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
      );

      console.log(`[SUCCESS] Retrieved latest version for key: ${key}`);
      return versions[0].versionId;

    } catch (error: any) {
      console.error(`[ERROR] Attempt ${attempt + 1} failed:`, error.message || error);
      attempt++;

      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 100;
        console.log(`[INFO] Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        console.error("[FATAL] Max retries reached. Unable to fetch file versions.");
        return null;
      }
    }
  }

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

    return new Promise((resolve, reject) => {
      fileReader.onload = async (event) => {
        try {
          // Upload the file
          await uploadData({
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

export async function getFileProperties(filePath: string, userId:string, projectId: string) {
  const key = `uploads/${userId}/${projectId}${filePath}`;
  try {
    const result = await getProperties({
      path: key,
      // Alternatively, path: ({ identityId }) => `album/${identityId}/1.jpg`
      options: {
        // Specify a target bucket using name assigned in Amplify Backend
        bucket: 'filestorage142024'
      }
    });
  } catch (error) {
    console.error('Error ', error);
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
        key: file.storageId,
      }).result;

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


const getDownloadLink = async (filePath: string): Promise<string | null> => {
  try {
    const linkToStorageFile = await getUrl({ path: filePath });
    console.log('Signed URL:', linkToStorageFile.url);
    console.log('Expires at:', linkToStorageFile.expiresAt);
    return linkToStorageFile.url.toString();
  } catch (error) {
    console.error('[ERROR] Failed to generate signed URL:', error);
    return null;
  }
};

export function startDownloadTask(fileKey: string, onProgress: (percent: number) => void) {
  const downloadTask = downloadData({
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

  return downloadTask;
}



export async function downloadFileToMemory(fileKey: string): Promise<Blob> {
  try {
    const { body } = await (await downloadData({ path: fileKey })).result;
    return await body.blob();
  } catch (error) {
    console.error("Error downloading file to memory:", error);
    throw error;
  }
}

export async function deleteFileFromStorage(fileKey: string): Promise<void> {
  try {
    await remove({ path: fileKey });
    console.log(`File deleted: ${fileKey}`);
  } catch (error) {
    console.error("Error deleting file:", error);
    throw error;
  }
}
