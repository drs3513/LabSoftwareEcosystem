import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";
import { fetchUserAttributes } from "aws-amplify/auth"; // ✅ Corrected imports

const client = generateClient<Schema>();


export async function createUserFromCognito() {
  try {

    const userAttributes = await fetchUserAttributes();

    const sub = userAttributes.sub as string;
    const name = userAttributes.preferred_username as string;
    const email = userAttributes.email as string;

    const now = new Date().toISOString();

    
    const newUser = await client.models.User.create({
      userId: sub, // Using Cognito User ID as primary key
      username: name,
      email,
      createdAt: now,
    });
    return newUser;
  } catch (error) {
    console.error("Error creating user from Cognito:", error);
  }
}


export async function getUsers() {
  return await client.models.User.list();
}


export async function getCurrentUser() {
  try {
    const userAttributes = await fetchUserAttributes();
    return {
      userId: userAttributes.sub,
      username: userAttributes.preferred_username,
      email: userAttributes.email,
    };
  } catch (error) {
    console.error("Error fetching current user:", error);
    return null;
  }
}
