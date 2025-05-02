import {generateClient} from "aws-amplify/data";
import type {Schema} from "@/amplify/data/resource";
import {fetchUserAttributes} from "aws-amplify/auth";

const client = generateClient<Schema>();

// **Roles**
export enum Role {
  NONE = "NONE",
  USER = "USER",
  ADMIN = "ADMIN",
  HEAD = "HEAD",
}

export const roleHierarchy: readonly Role[] = [Role.NONE, Role.USER, Role.ADMIN, Role.HEAD];

/**
 * Adds a user to the project's whitelist with a given role.
 * Includes audit metadata such as the email of the creator.
 *
 * @param {string} projectId - The project ID.
 * @param {string} userId - The user ID to be whitelisted.
 * @param {Role} role - The role to assign to the user.
 * @returns {Promise<Schema["Whitelist"]["type"] | null>} - The created whitelist entry, or null on failure.
 */
export async function whitelistUser(projectId: string, userId: string, role: Role) {
  try {
    const currentUser = (await fetchUserAttributes());
    if (!currentUser.email) {
      //console.log("Current user email not found.");
      return null;
    }
    const now = new Date().toISOString();
    const whitelistId = `${projectId}-${userId}`;
    const response = await client.models.Whitelist.create({
      whitelistId,
      userIds: userId,
      projectId,
      createdAt: now,
      createdBy: currentUser.email,
      role: role,
    });
    //console.log(response);
    return response;
  } catch (error) {
    //console.log("Error whitelisting user:", error);
    return null;
  }
}

/**
 * Removes a user from the whitelist if their role is lower than the current user.
 *
 * @param {string} projectId - The project ID.
 * @param {string} userId - The ID of the user to remove.
 * @param {Role} currentUserRole - The role of the user initiating the removal.
 * @returns {Promise<boolean>} - True if removed, false otherwise.
 */
export async function removeWhitelistedUser(projectId: string, userId: string, currentUserRole: Role) {
  try {
    const whitelistId = `${projectId}-${userId}`;
    const user = await client.models.Whitelist.get({ whitelistId });

    if (!user?.data) return false;

    const userRole = (user.data.role as Role) || Role.USER;
    if (userRole === currentUserRole || userRole === Role.HEAD) {
      console.warn("Cannot remove a user of equal or higher rank.");
      return false;
    }

    await client.models.Whitelist.delete({ whitelistId });
    return true;
  } catch (error) {
    ////console.log("Error removing whitelisted user:", error);
    return false;
  }
}
/**
 * Downgrades a whitelisted user to the USER role.
 *
 * @param {string} projectId - The project ID.
 * @param {string} userId - The user ID to downgrade.
 * @returns {Promise<any>} - The updated whitelist entry or undefined on error.
 */
export async function revokeUserAdmin(projectId: string, userId: string) {
  const whitelistId = `${projectId}-${userId}`;
  try {
    return await client.models.Whitelist.update({
      whitelistId: whitelistId,
      role: "USER",
    });
  } catch (e) {
    ////console.log(e);
  }
}

/**
 * Elevates a user's role in a project to ADMIN, if not already.
 *
 * @param {string} projectId - The project ID.
 * @param {string} userId - The user ID to promote.
 * @returns {Promise<any>} - The updated whitelist entry or undefined on error.
 */
export async function elevateUserToAdmin(projectId: string, userId: string) {
  const userRole = await getUserRole(projectId, userId);
  if (userRole === Role.ADMIN) {
    return;
  }
  const whitelistId = `${projectId}-${userId}`;
  try {
    return await client.models.Whitelist.update({
      whitelistId: whitelistId,
      role: "ADMIN",
    });
  } catch (e) {
    ////console.log(e);
  }
}

/**
 * Gets the role of a specific user within a project.
 *
 * @param {string} projectId - The project ID.
 * @param {string} userId - The user ID.
 * @returns {Promise<Role>} - The user's role in the project, or NONE if not found.
 */
export async function getUserRole(projectId: string, userId: string): Promise<Role> {
  try {
    const whitelistId = `${projectId}-${userId}`;
    const response = await client.models.Whitelist.get({ whitelistId });
    return (response.data?.role as Role) || Role.NONE;
  } catch (error) {
    ////console.log("Error getting user role:", error);
    return Role.NONE;
  }
}

/**
 * Checks whether a user is whitelisted for a given project.
 *
 * @param {string} userId - The user's ID.
 * @param {string} projectId - The project ID.
 * @returns {Promise<boolean>} - True if whitelisted, false otherwise.
 */
export async function isUserWhitelistedForProject(userId: string, projectId: string): Promise<boolean> {
  try {
    const whitelistId = `${projectId}-${userId}`;
    const response = await client.models.Whitelist.get({ whitelistId });

    return !!response.data;


  } catch (error) {
    console.error("Error checking if user is whitelisted:", error);
    return false;
  }
}

/**
 * Lists users who are either in or not in the specified project's whitelist.
 *
 * @param {string} projectId - The project ID.
 * @param {boolean} inProject - True to list whitelisted users, false to list non-whitelisted users.
 * @returns {Promise<Schema["User"]["type"][] | false>} - Array of users or false on error.
 */
export async function listUsersInProject(projectId: string, inProject: boolean) {
  try {
    const currentUsers =  await client.models.Whitelist.list({
      filter: {
        projectId: {eq: projectId}
      }
    })
    if(!currentUsers) return []

    const allUsers = await client.models.User.list()

    return allUsers.data.filter(user => inProject ? currentUsers.data.some(currentUser => user.userId === currentUser.userIds) : !currentUsers.data.some(currentUser => user.userId === currentUser.userIds))


  } catch (error) {
    console.error("Error finding whitelistable users", error);
    return false;
  }

}