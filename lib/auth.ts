import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";
const client = generateClient<Schema>()

export async function deleteUser(userId: string, email: string){
    try {
        const response = await client.mutations.deleteUserFromCognito({userId: userId, username: email})

        console.log(response)

        return response
    } catch(error){
        console.error(`Error deleting user with email ${email} : `, error)
    }

}

export async function createUser(email: string){
    try {
        const response = await client.mutations.createUserInCognito({email: email})
        return response
    } catch(error){
        console.error(`Error creating user with email ${email} : `, error)
    }
}