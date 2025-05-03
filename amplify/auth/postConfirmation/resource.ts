import { defineFunction } from '@aws-amplify/backend';

export const postConfirmation = defineFunction({
    name: 'post-confirmation',
    resourceGroupName: 'auth',
    timeoutSeconds: 899
});