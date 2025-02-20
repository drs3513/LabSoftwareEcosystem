import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";

const client = generateClient<Schema>();

// **Roles**
export enum Role {
  USER = "USER",
  ADMIN = "ADMIN",
  HEAD = "HEAD",
}

//  Whitelist User (with Role)
export async function whitelistUser(fileId: string, userEmail: string, role: Role) {
  try {
    const now = new Date().toISOString();
    const whitelistId = `${fileId}-${userEmail}`;
    const response = await client.models.Whitelist.create({
      whitelistId,
      userIds: userEmail,
      fileId,
      createdAt: now,
      isAdmin: role === Role.ADMIN || role === Role.HEAD, 
      role: role,
    });
    return response;
  } catch (error) {
    console.error("Error whitelisting user:", error);
    return null;
  }
}

// Remove User from Whitelist (Only if Lower Role)
export async function removeWhitelistedUser(fileId: string, userEmail: string, currentUserRole: Role) {
  try {
    const whitelistId = `${fileId}-${userEmail}`;
    const user = await client.models.Whitelist.get({ whitelistId });

    if (!user) return false;

    const userRole = user.data?.role as Role;
    if (userRole && (userRole === currentUserRole || userRole === Role.HEAD)) {
      throw new Error("You cannot remove a user of equal or higher rank.");
    }

    await client.models.Whitelist.delete({ whitelistId });
    return true;
  } catch (error) {
    console.error("Error removing whitelisted user:", error);
    return false;
  }
}

// Check User Role
export async function getUserRole(fileId: string, userEmail: string): Promise<Role | null> {
  try {
    const whitelistId = `${fileId}-${userEmail}`;
    const response = await client.models.Whitelist.get({ whitelistId });
    return response.data?.role as Role || null; // Cast to Role
  } catch (error) {
    console.error("Error getting user role:", error);
    return null;
  }
}

// List Users Below Role
export async function listUsersBelowRole(fileId: string, role: Role) {
  try {
    const response = await client.models.Whitelist.list();
    return response.data.filter((user) => {
      const userRole = user.role as Role || Role.USER;
      return user.fileId === fileId && userRole !== Role.HEAD && userRole !== role;
    });
  } catch (error) {
    console.error("Error listing users:", error);
    return [];
  }
}
