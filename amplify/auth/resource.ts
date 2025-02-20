// amplify/backend/auth/hooks.ts

import { defineAuth } from "@aws-amplify/backend";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "../data/resource";
import { add_user } from "./add_user/resource";

const client = generateClient<Schema>();

export const auth = defineAuth({
  loginWith: {
    email: true, // Allow users to login with email
  },
  userAttributes: {
    preferredUsername: {
      mutable: true,
      required: true,
    },
  },
  triggers: {
    postConfirmation: add_user
  },
});
