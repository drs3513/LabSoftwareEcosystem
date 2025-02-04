import { uploadData, getUrl, remove, downloadData, isCancelError } from "aws-amplify/storage"; // ✅ Correct Imports for Amplify Gen 2


export async function uploadFile(file: File, userId: string): Promise<string> {
  try {
    const key = `uploads/${userId}/${file.name}`;

    
    const fileReader = new FileReader();
    fileReader.readAsArrayBuffer(file);

    return new Promise((resolve, reject) => {
      fileReader.onload = async (event) => {
        try {
          await uploadData({
            data: event.target?.result as ArrayBuffer,
            path: key,
            options: {
              contentType: file.type,
            },
          });
          console.log("File uploaded successfully:", key);
          resolve(key);
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


export async function getDownloadUrl(fileKey: string): Promise<string> {
  try {
    const response = await getUrl({ path: fileKey }); 
    let url = response.url.toString()
    return url;
  } catch (error) {
    console.error("Error getting file URL:", error);
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
