import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { storage } from './storage/resource';
import { ManagedPolicy } from 'aws-cdk-lib/aws-iam';

const backend = defineBackend({
  auth,
  storage,
  data
});

// Attach managed policy to authenticated users
backend.auth.resources.authenticatedUserIamRole.addManagedPolicy(
  ManagedPolicy.fromAwsManagedPolicyName('AmazonS3FullAccess')
);

backend.auth.resources.groups["USER"].role.addManagedPolicy(
    ManagedPolicy.fromAwsManagedPolicyName('AmazonS3FullAccess')
)
backend.auth.resources.groups["ADMINISTRATOR"].role.addManagedPolicy(
    ManagedPolicy.fromAwsManagedPolicyName('AmazonS3FullAccess')
)

//  Customize Cognito User Pool password policy
const { cfnUserPool } = backend.auth.resources.cfnResources;

cfnUserPool.policies = {
  passwordPolicy: {
    minimumLength: 8,
    requireLowercase: true,
    requireNumbers: true,
    requireSymbols: true,
    requireUppercase: true,
    temporaryPasswordValidityDays: 20,
  },
};
