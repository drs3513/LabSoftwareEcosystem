import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, BatchGetCommand } from "@aws-sdk/lib-dynamodb";
import { Context } from "aws-lambda";

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const TABLE_NAME = process.env.DATA_FILE_TABLE_NAME || "File";

export const handler = async (event: any, context: Context) => {
  const fileIds: string[] = event.fileIds || [];
  const projectId: string | undefined = event.projectId;

  if (!fileIds.length || !projectId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "fileIds and projectId are required" }),
    };
  }

  const keys = fileIds.map((fileId: string) => ({ fileId }));

  const command = new BatchGetCommand({
    RequestItems: {
      [TABLE_NAME]: {
        Keys: keys,
      },
    },
  });

  try {
    const response = await client.send(command);
    const allFiles = response.Responses?.[TABLE_NAME] || [];

    //Filter to match projectId
    const filteredFiles = allFiles.filter(
      (file: any) => file.projectId === projectId
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ files: filteredFiles }),
    };
  } catch (error) {
    console.error("BatchGetCommand failed:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal server error" }),
    };
  }
};
