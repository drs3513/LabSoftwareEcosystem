import { Storage } from "aws-amplify";

// ✅ Upload a File to S3
export async function uploadFile(file: File, userId: string): Promise<string> {
  try {
    const key = `uploads/${userId}/${file.name}`;
    const result = await Storage.put(key, file, {
      contentType: file.type,
    });
    return result.key;
  } catch (error) {
    console.error("Error uploading file:", error);
    throw error;
  }
}

// ✅ Get Download URL for a File
export async function getDownloadUrl(fileKey: string): Promise<string> {
  try {
    return await Storage.get(fileKey);
  } catch (error) {
    console.error("Error getting file URL:", error);
    throw error;
  }
}

// ✅ Delete a File from S3
export async function deleteFileFromStorage(fileKey: string): Promise<void> {
  try {
    await Storage.remove(fileKey);
  } catch (error) {
    console.error("Error deleting file:", error);
    throw error;
  }
}
