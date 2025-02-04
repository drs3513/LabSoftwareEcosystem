import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";

const client = generateClient<Schema>();

// ✅ Create a Tag
export async function createTag(tagType: "file" | "message", refId: string, tagName: string) {
  try {
    const tagId = `tag-${Math.floor(Math.random() * 100000)}`;
    const now = new Date().toISOString();

    const newTag = await client.models.Tag.create({
      tagId,
      tagType,
      refId,
      tagName,
      createdAt: now,
    });

    console.log("Created tag:", newTag);
    return newTag;
  } catch (error) {
    console.error("Error creating tag:", error);
  }
}

// ✅ Get Tags for a File or Message
export async function getTagsForRef(refId: string) {
  return (await client.models.Tag.list()).filter((tag) => tag.refId === refId);
}

// ✅ Delete a Tag
export async function deleteTag(tagId: string) {
  try {
    await client.models.Tag.delete({ tagId });
    console.log(`Deleted tag: ${tagId}`);
  } catch (error) {
    console.error("Error deleting tag:", error);
  }
}
