import type { PostConfirmationTriggerHandler } from "aws-lambda";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "../../data/resource";

const client = generateClient<Schema>();

export const handler: PostConfirmationTriggerHandler = async (event) => {
  console.log("PostConfirmation event received:", event);

  try {
    const now = new Date().toISOString();

    // Ensure userId is from Cognito's "sub"
    const newUser = await client.models.User.create({
      userId: event.request.userAttributes.sub, // Use Cognito User ID as primary key
      username: event.userName,
      email: event.request.userAttributes.email || "",
      createdAt: now,
    });

    console.log("User added to database successfully:", newUser);
  } catch (error) {
    console.error("Error adding user to database:", error);
  }

  return event; // Always return event
};