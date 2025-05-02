import type { Schema } from "../resource"
import {env} from "$amplify/env/deleteUser"

import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import {
    AdminDisableUserCommand,
    AdminDeleteUserCommand,
    CognitoIdentityProviderClient,
} from "@aws-sdk/client-cognito-identity-provider"

const {resourceConfig, libraryOptions} = await getAmplifyDataClientConfig(
    env
);


Amplify.configure(resourceConfig, libraryOptions);
type Handler = Schema["deleteUserFromCognito"]["functionHandler"]
const client = new CognitoIdentityProviderClient()
const dataClient = generateClient<Schema>();



export const handler: Handler = async (event) => {
    const { userId, username } = event.arguments
    const command_disable = new AdminDisableUserCommand({
        UserPoolId: env.AMPLIFY_AUTH_USERPOOL_ID,
        Username: username
    })
    const response_disable = await client.send(command_disable)
    console.log(response_disable)
    const command_delete = new AdminDeleteUserCommand({
        UserPoolId: env.AMPLIFY_AUTH_USERPOOL_ID,
        Username: username
    })

    const response_delete = await client.send(command_delete)

    console.log(response_delete)

    const response_data_delete = await dataClient.models.User.delete({
        userId: userId
    })

    console.log(response_data_delete)
    return response_data_delete
}