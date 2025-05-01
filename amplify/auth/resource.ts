import { defineAuth } from "@aws-amplify/backend";
import { postConfirmation } from "./post-confirmation/resource"
export const auth = defineAuth({
  loginWith: {
    email: true,
  },
  userAttributes: {
    preferredUsername: {
      mutable: true,
      required: true,
    },
    "custom:administrator": {
      dataType: "Boolean",
      mutable: true
    }
  },
  groups: ["ADMINISTRATOR", "USER"],
  triggers: {
    postConfirmation
  },
  access: (allow) => [
    allow.resource(postConfirmation).to(["addUserToGroup"]),
  ],

});
