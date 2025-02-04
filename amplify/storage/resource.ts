import { defineStorage } from "@aws-amplify/backend";

export const storage = defineStorage({
  name: "amplifyStorage",
  access: (allow) => ({
    // Owners can manage their own files
    "uploads/{userId}/*": [
      allow.entity("identity").to(["read", "write", "delete"]),
    ],

    // Whitelisted users can read and write files in the directory
    "uploads/{fileId}/*": [
      allow.entity("identity").to(["read", "write"]),
    ],
  }),
});
