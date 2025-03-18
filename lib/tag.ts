import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";

const client = generateClient<Schema>();

export async function createTag(tagType: "file" | "message", fileId: string, projectId: string, tagName: string) {
  try {
    console.log(projectId)
    const tagId = `tag-${Math.floor(Math.random() * 100000)}`;
    const now = new Date().toISOString();
    let newTag;
    if(tagType == "file"){
        newTag = await client.models.Tag.create({
              tagId,
             tagType,
             fileId:fileId,
             projectId,
              tagName,
              createdAt: now,
        });
    }
    else{
         newTag = await client.models.Tag.create({
            tagId,
            tagType,
            messageId:fileId,
            tagName,
            createdAt: now,
      });
    }

    console.log("Created tag:", newTag);
    return true;
  } catch (error) {
    console.error("Error creating tag:", error);
    return false
  }
}

export async function getTagsForRef(refId: string) {
    try {
      // Fetch tags and extract `data` array
      const response = await client.models.Tag.list();
      const tags = response.data; // Extract data array
  
      // Filter tags based on refId
      return tags.filter((tag) => tag.fileId === refId || tag.messageId === refId);
    } catch (error) {
      console.error("Error fetching tags:", error);
      return [];
    }
  }

  export async function listTagsForProject(projectId: string){
    try {
        const response = await client.models.Tag.list({
            filter: {
                projectId: {eq: projectId}
            }
        })
        console.log(response.data)
        return response.data
    } catch(error) {
        console.error(error)
    }

  }
export async function deleteTag(tagId: string) {
  try {
    await client.models.Tag.delete({ tagId });
    console.log(`Deleted tag: ${tagId}`);
  } catch (error) {
    console.error("Error deleting tag:", error);
  }
}
