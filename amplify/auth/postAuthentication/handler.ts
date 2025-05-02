import type { PostAuthenticationTriggerHandler } from 'aws-lambda';
import {
    CognitoIdentityProviderClient,
    AdminAddUserToGroupCommand,
    AdminListGroupsForUserCommand
} from '@aws-sdk/client-cognito-identity-provider';
import { Amplify } from "aws-amplify";
import { DataStore } from "aws-amplify/datastore"
import { type Schema } from "../../data/resource";
import { generateClient } from "aws-amplify/data";
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import { env } from "$amplify/env/post-authentication";

const {resourceConfig, libraryOptions} = await getAmplifyDataClientConfig(
    env
);
Amplify.configure(resourceConfig, libraryOptions);

const dataClient = generateClient<Schema>();


const client = new CognitoIdentityProviderClient();


// add user to group
export const handler: PostAuthenticationTriggerHandler = async (event) => {
    const command_1 = new AdminListGroupsForUserCommand({
        Username: event.userName,
        UserPoolId: event.userPoolId
    })

    const groups = await client.send(command_1)

    let adaptedGroups = undefined
    if(groups.Groups){
        adaptedGroups = groups.Groups.map(group => group.GroupName)
        console.log(`Groups : ${adaptedGroups}`)
    } else {
        console.log(groups)
        console.log("No groups!")
    }


    console.log("---")
    if(!adaptedGroups || !adaptedGroups.includes("USER")){
        console.log("Setting User Group")
        const command = new AdminAddUserToGroupCommand({
            GroupName: "USER",
            Username: event.userName,
            UserPoolId: event.userPoolId
        });
        const response = await client.send(command);
        console.log(response)
        console.log('processed', response.$metadata.requestId);
    }

    const currentUser = await dataClient.models.User.get({
        userId: event.request.userAttributes.sub
    })
    console.log("Retrieved current User")
    console.log(currentUser)
    console.log("----")
    console.log("Usable user attributes :")
    console.log(event.request.userAttributes)
    if(!currentUser.data){
        const now = new Date().toISOString();
        console.log("Creating user with username : ")
        console.log(event.request.userAttributes.preferred_username)
        const createdUser = await dataClient.models.User.create({
            userId: event.request.userAttributes.sub,
            username: event.request.userAttributes.preferred_username,
            email: event.request.userAttributes.email,
            createdAt: now,
            administrator: (adaptedGroups && adaptedGroups.includes("ADMINISTRATOR"))
        })
        console.log("Created User : " + createdUser)
    } else if(!currentUser.data.administrator && adaptedGroups && adaptedGroups.includes("ADMINISTRATOR")){
        console.log("HERE!")
        const updatedUser = await dataClient.models.User.update({
            userId: event.request.userAttributes.sub,
            administrator: true
        })
        console.log(updatedUser)
    }



    return event;
};