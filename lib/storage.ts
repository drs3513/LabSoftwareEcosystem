import { uploadData, getUrl, remove, downloadData, getProperties } from "aws-amplify/storage";


// Upload file and return S3 key and version ID
export async function uploadFile(
  file: File,
  userId: string,
  filePath: string
): Promise<{ key: string; versionId: string }> {
  try {
    const key = `uploads/${userId}${filePath}`;
    const fileReader = new FileReader();
    fileReader.readAsArrayBuffer(file);

    return new Promise((resolve, reject) => {
      fileReader.onload = async (event) => {
        try {
          const response = await uploadData({
            data: event.target?.result as ArrayBuffer,
            path: key,
            options: {
              contentType: file.type,
            },
          });

          // Get file properties (including versionId)
          const properties = await getProperties({ path: key });
          const versionId = properties?.versionId || "1"; // Default to "1" if no versionId

          resolve({ key, versionId });
        } catch (error) {
          console.error("Error uploading file:", error);
          reject(error);
        }
      };

      fileReader.onerror = (error) => {
        console.error("File reading error:", error);
        reject(error);
      };
    });
  } catch (error) {
    console.error("Error starting upload:", error);
    throw error;
  }
}


// Get download URL for a file
export async function getDownloadUrl(fileKey: string): Promise<string> {
  try {
    const response = await getUrl({ path: fileKey });
    return response.url.toString();
  } catch (error) {
    console.error("Error getting file URL:", error);
    throw error;
  }
}


