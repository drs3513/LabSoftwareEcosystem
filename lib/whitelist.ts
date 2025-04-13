import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";
import { getUsers } from "@/lib/user";
import { fetchUserAttributes } from "aws-amplify/auth";

const client = generateClient<Schema>();

// **Roles**
export enum Role {
  NONE = "NONE",
  USER = "USER",
  ADMIN = "ADMIN",
  HEAD = "HEAD",
}

export const roleHierarchy: readonly Role[] = [Role.NONE, Role.USER, Role.ADMIN, Role.HEAD];

// Whitelist User (with Role)
export async function whitelistUser(projectId: string, userId: string, role: Role) {
  try {
    const currentUser = (await fetchUserAttributes());
    if (!currentUser.email) {
      console.log("Current user email not found.");
      return null;
    };
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
    return response;
  } catch (error) {
    console.log("Error whitelisting user:", error);
    return null;
  }
}

// Remove User from Whitelist (Only if Lower Role)
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
    //console.log("Error removing whitelisted user:", error);
    return false;
  }
}

export async function revokeUserAdmin(projectId: string, userId: string) {
  const whitelistId = `${projectId}-${userId}`;
  try {
    const response = await client.models.Whitelist.update({
      whitelistId: whitelistId,
      role: "USER",
    });
    return response;
  } catch (e) {
    //console.log(e);
  }
}

export async function elevateUserToAdmin(projectId: string, userId: string) {
  const userRole = await getUserRole(projectId, userId);
  if (userRole === Role.ADMIN) {
    return;
  }
  const whitelistId = `${projectId}-${userId}`;
  try {
    const response = await client.models.Whitelist.update({
      whitelistId: whitelistId,
      role: "ADMIN",
    });
    return response;
  } catch (e) {
    //console.log(e);
  }
}

// Check User Role
export async function getUserRole(projectId: string, userId: string): Promise<Role> {
  try {
    const whitelistId = `${projectId}-${userId}`;
    const response = await client.models.Whitelist.get({ whitelistId });
    return (response.data?.role as Role) || Role.NONE;
  } catch (error) {
    //console.log("Error getting user role:", error);
    return Role.NONE;
  }
}

export async function listUsersBelowRole(projectId: string, role: Role) {
  try {
    // Slice the global roleHierarchy to the current role
    const slicedHierarchy = roleHierarchy.slice(0, roleHierarchy.indexOf(role));

    // Fetch whitelist entries for project where role is below the current role
    const whitelistResponse = await client.models.Whitelist.list({
      filter: {
        projectId: { eq: projectId },
        or: slicedHierarchy.map((r) => ({
          role: { eq: r },
        })),
      },
    });

    const whitelistEntries = whitelistResponse.data;
    if (!whitelistEntries || whitelistEntries.length === 0) {
      return [];
    }

    // Get userIds from whitelist entries
    const userIds = whitelistEntries.map(entry => entry.userIds).filter(Boolean);
    // Find users with those userIds
    const userResponse = await client.models.User.list({
      filter: {
        or: userIds.map(id => ({ userId: { eq: id } }))
      }
    });

    return userResponse.data ?? [];

  } catch (error) {
    console.error("Error listing users:", error);
    return [];
  }
}

export async function isUserWhitelistedForProject(userId: string, projectId: string): Promise<boolean> {
  try {
    const whitelistId = `${projectId}-${userId}`;
    const response = await client.models.Whitelist.get({ whitelistId });

    if (response.data) {
      return true; // User is whitelisted
    }

    return false;
  } catch (error) {
    console.error("Error checking if user is whitelisted:", error);
    return false;
  }
}

export function CreateWhitelistPanel(projectId: string, userId: string) {
  console.log(`CreateWhitelistPanel called with projectId: ${projectId}, userId: ${userId}`);
  // Add logic for displaying the whitelist creation panel here
}

