import type { Schema } from "../resource"
import {fetchAuthSession} from 'aws-amplify/auth'
import {env} from "$amplify/env/createUserInCognito"
import {
    AdminCreateUserCommand,
    CognitoIdentityProviderClient,
} from "@aws-sdk/client-cognito-identity-provider"

type Handler = Schema["createUserInCognito"]["functionHandler"]
const client = new CognitoIdentityProviderClient()

export const handler: Handler = async (event) => {
    const { email } = event.arguments

    const command = new AdminCreateUserCommand({
        Username: email,
        UserPoolId: env.AMPLIFY_AUTH_USERPOOL_ID
    })

    const response = await client.send(command)
    return response


}