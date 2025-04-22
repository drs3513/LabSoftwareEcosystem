import { defineStorage } from "@aws-amplify/backend";

export const storage = defineStorage({
  name: "filestorage142024",
    isDefault: true,
  access: (allow) => ({
    "uploads/*": [allow.authenticated.to(["read", "write", "delete"])], // Correct syntax
  }),
  versioned: true,
});
