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
              // Specify a target bucket using name assigned in Amplify Backend
              bucket: 'filestorage142024'
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
