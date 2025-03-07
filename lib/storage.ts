import { uploadData, getUrl, remove, downloadData, getProperties } from "aws-amplify/storage";


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

          console.log(`Upload complete: ${key}`);
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

// Function to get version ID separately
export async function getVersionId(filePath: string): Promise< string> {
  
  let retries = 5;
  let delay = 1500; // Start with 1.5s delay
  let versionId = "1"; // Default versionId if not found

  while (retries > 0) {
    try {
      const properties = await getProperties({ path: filePath });
      if (properties?.versionId) {
        console.log(`Successfully retrieved versionId: ${properties.versionId}`);
        return properties.versionId;
      }
    } catch (error) {
      console.warn(`Retrying getProperties... Attempts left: ${retries}`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2; // Exponential backoff (1.5s → 3s → 6s)
    }
    retries--;
  }

  console.warn("Failed to retrieve file properties after retries. Using default versionId.");
  return versionId;
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
