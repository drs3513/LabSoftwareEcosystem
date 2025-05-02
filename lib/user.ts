import {generateClient} from "aws-amplify/data";
import type {Schema} from "@/amplify/data/resource";
import {fetchUserAttributes, getCurrentUser, fetchAuthSession} from "aws-amplify/auth";

const client = generateClient<Schema>();

/**
 * Creates a new user in the database using attributes fetched from the authenticated Cognito user.
 * If the user already exists, this function should not be called.
 *
 * @returns {Promise<Schema["User"]["type"] | undefined>} - The newly created user record, or undefined on error.
 */

export async function createUserFromCognito() {
  try {

    const userAttributes = await fetchUserAttributes();


    const sub = userAttributes.sub as string;
    const name = userAttributes.preferred_username as string;
    const email = userAttributes.email as string;

    const now = new Date().toISOString();


    return await client.models.User.create({
      userId: sub, // Using Cognito User ID as primary key
      username: name,
      email,
      createdAt: now
    });
  } catch (error) {
    console.error("Error creating user from Cognito:", error);
  }
}

/**
 * Retrieves a list of all users from the User model.
 *
 * @returns {Promise<Schema["User"]["type"][]>} - An array of user records from the database.
 */
export async function getUsers() {
  const user_list = await client.models.User.list();
  //console.log(user_list);
  return user_list;
}

/**
 * Fetches the currently authenticated user's attributes from Cognito.
 *
 * @returns {Promise<{ userId: string; username: string; email: string; administrator?: string } | null>}
 *          - The authenticated user's basic attributes, or null on error.
 */
export async function getActiveUser() {
  try {

    const user = await getCurrentUser()
    const userAttributes = (await client.models.User.get({
      userId: user.userId
    })).data;
    if(!userAttributes) return
    return {
      userId: userAttributes.userId,
      username: userAttributes.username,
      email: userAttributes.email,
      administrator: userAttributes.administrator,
      createdAt: userAttributes.createdAt
    };
  } catch (error) {
    console.error("Error fetching current user:", error);
    return null;
  }
}

export async function getUserByUserId(userId: string){
  try {
    const userAttributes = await client.models.User.get({
      userId
    },
    {
      selectionSet: ["userId", "username", "email"]
    })
    if(!userAttributes) return
    return userAttributes.data
  } catch (error) {
    console.error(`Error fetching user with userId: ${userId}:`, error)
  }

}

export async function getUsersNotAdmin(){
  try {
    const users = await client.models.User.list({
      filter: {
        administrator: {eq: false}
      }
    })
    return users.data
  } catch (error) {
    console.error(`Could not fetch users that are not admin :`, error)
  }
}
/*                    *
 *    Future Work     *
 *                    */
//export async function isUserAdmin(userId: string) {
//  try {
//    const response = await client.models.User.get({ userId });
//    if (!response || !response.data) {
//      console.log("User not found:", userId);
//      return false;
//    }
//    const user = response.data;
//    return user.administrator;
//  } catch (error) {
//    console.error("Error checking if user is admin:", error);
//    return false;
//  }
//}
//
//export async function getUserIdFromEmail(userEmail: string) {
//  try {
//    const response = await client.models.User.list({
//      filter: { email: { eq: userEmail } },
//    });
//
//    if (!response || !response.data || response.data.length === 0) {
//      console.log("User not found for email:", userEmail);
//      return null;
//    }
//
//    return response.data[0].userId;
//  } catch (e) {
//    console.error("Error getting user ID:", e);
//    return null;
//  }
//}
//
