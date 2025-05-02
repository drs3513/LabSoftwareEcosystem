
import { defineFunction } from '@aws-amplify/backend';

export const customMessage = defineFunction({
    name: "customMessage",
    resourceGroupName: 'auth'
});