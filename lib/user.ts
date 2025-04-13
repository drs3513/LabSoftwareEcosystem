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
  const user_list = await client.models.User.list();
  console.log(user_list);
  return user_list;
}


export async function getCurrentUser() {
  try {
    const userAttributes = await fetchUserAttributes();
    return {
      userId: userAttributes.sub,
      username: userAttributes.preferred_username,
      email: userAttributes.email,
      administrator: userAttributes.administrator,
    };
  } catch (error) {
    console.error("Error fetching current user:", error);
    return null;
  }
}

export async function isUserAdmin(userId: string) {
  try {
    const response = await client.models.User.get({ userId });
    if (!response || !response.data) {
      console.log("User not found:", userId);
      return false;
    }
    const user = response.data;
    return user.administrator;
  } catch (error) {
    console.error("Error checking if user is admin:", error);
    return false;
  }
}

export async function getUserIdFromEmail(userEmail: string) {
  try {
    const response = await client.models.User.list({
      filter: { email: { eq: userEmail } },
    });

    if (!response || !response.data || response.data.length === 0) {
      console.log("User not found for email:", userEmail);
      return null;
    }

    return response.data[0].userId;
  } catch (e) {
    console.error("Error getting user ID:", e);
    return null;
  }
}

