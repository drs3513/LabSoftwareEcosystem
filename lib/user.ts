import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";
import { Auth } from "aws-amplify"; // ✅ Import Cognito Auth

const client = generateClient<Schema>();

// ✅ Create a User (Pulling Cognito User Info)
export async function createUserFromCognito() {
  try {
    // ✅ Get currently authenticated user from Cognito
    const user = await Auth.currentAuthenticatedUser();
    const { sub, email, name } = user.attributes; // Retrieve user attributes

    const now = new Date().toISOString();

    // ✅ Create User in the database
    const newUser = await client.models.User.create({
      userId: sub, // Using Cognito User ID as primary key
      username: name || email.split("@")[0], // Default to email prefix if name is unavailable
      email,
      createdAt: now,
    });

    console.log("User created in database:", newUser);
    return newUser;
  } catch (error) {
    console.error("Error creating user from Cognito:", error);
  }
}

// ✅ Read Users
export async function getUsers() {
  return await client.models.User.list();
}

// ✅ Get Current User Info
export async function getCurrentUser() {
  try {
    const user = await Auth.currentAuthenticatedUser();
    return {
      userId: user.attributes.sub,
      username: user.attributes.name || user.attributes.email.split("@")[0],
      email: user.attributes.email,
    };
  } catch (error) {
    console.error("Error fetching current user:", error);
    return null;
  }
}
