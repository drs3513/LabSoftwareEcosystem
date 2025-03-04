import { defineStorage } from "@aws-amplify/backend";

export const storage = defineStorage({
  name: "amplifyStorage",
  access: (allow) => ({
    "uploads/*": [allow.authenticated.to(["read", "write", "delete"])], // Correct syntax
  }),
});
