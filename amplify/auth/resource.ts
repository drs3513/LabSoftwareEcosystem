import { defineAuth } from "@aws-amplify/backend";
import { postAuthentication } from "./postAuthentication/resource"
import {deleteUser} from "../data/deleteUser/resource"
import {createUserInCognito} from "../data/createUser/resource"
import {customMessage} from "./customMessage/resource"
export const auth = defineAuth({
  loginWith: {
    email: true,
  },
  userAttributes: {
    preferredUsername: {
      mutable: true,
      required: true,
    },
  },
  groups: ["ADMINISTRATOR", "USER"],
  triggers: {
    customMessage,
    postAuthentication
  },
  access: (allow) => [
    allow.resource(postAuthentication).to(["addUserToGroup", "listGroupsForUser"]),
    allow.resource(deleteUser).to(["disableUser", "deleteUser"]),
    allow.resource(createUserInCognito).to(["createUser"])
  ],

});
