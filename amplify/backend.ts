import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource.js';
import { data } from './data/resource.js';
import { storage } from './storage/resource.js';

import {Effect, PolicyStatement} from 'aws-cdk-lib/aws-iam';

const backend = defineBackend({
  auth,
  storage,
  data,
  
});

const bucketName = 'filestorage142024';

backend.auth.resources.authenticatedUserIamRole.addToPrincipalPolicy(
  new PolicyStatement({
    effect: Effect.ALLOW,
    actions: [
      "s3:GetObject",
      "s3:PutObject",
      "s3:DeleteObject",
      "s3:ListBucket",
      "s3:ListBucketVersions",
      "s3:GetObjectVersion"
    ],
    resources: [
      `arn:aws:s3:::${bucketName}`,
      `arn:aws:s3:::${bucketName}/uploads/*`,
    ],
  })
);

// (Optional) Grant read-only access to unauthenticated users
backend.auth.resources.unauthenticatedUserIamRole?.addToPrincipalPolicy(
  new PolicyStatement({
    effect: Effect.ALLOW,
    actions: [
      "s3:GetObject",
      "s3:ListBucket",
    ],
    resources: [
      `arn:aws:s3:::${bucketName}`,
      `arn:aws:s3:::${bucketName}/uploads/*`,
    ],
  })
);

const { cfnUserPool } = backend.auth.resources.cfnResources;
// modify cfnUserPool policies directly
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