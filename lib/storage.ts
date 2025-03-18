import { uploadData, getUrl, remove, downloadData, getProperties } from "aws-amplify/storage";
import { S3Client, ListObjectVersionsCommand } from "@aws-sdk/client-s3";
import { fetchAuthSession } from "aws-amplify/auth";
const s3Client = new S3Client({ region: "us-east-1" });

export async function getFileVersions(key: string): Promise<string | null> {
  try {
    const session = await fetchAuthSession();
    if (!session || !session.credentials) {
      throw new Error("No valid credentials found");
    }

    const response = await fetch("/api/s3-versions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        credentials: session.credentials,
        key, // Send the file key dynamically
      }),
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const versions = data.versions.filter((v: any) => v.key === key);

    if (versions.length === 0) {
      console.warn(`No versions found for key: ${key}`);
      return null;
    }

    // Sort versions by lastModified timestamp (newest first)
    versions.sort(
      (a: any, b: any) =>
        new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
    );

    return versions[0].versionId; // Return latest version ID
  } catch (error) {
    console.error("Error fetching latest version ID from API:", error);
    return null;
  }
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

export async function downloadFile(fileKey: string): Promise<Blob | string | object> {
  try {
    const downloadResult = await downloadData({ path: fileKey }).result;
    
    
    const text = await downloadResult.body.text(); 
    console.log("File downloaded as text:", text);

    // Alternative formats:
    // const blob = await downloadResult.body.blob(); 
    // const json = await downloadResult.body.json(); 
    
    return text; 
  } catch (error) {
    console.error("Error downloading file:", error);
    throw error;
  }
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
