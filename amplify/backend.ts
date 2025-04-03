import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource.js';
import { data} from './data/resource.js';
import { storage } from './storage/resource.js';

import { echoHandler } from './functions/echo/resource'
import { listFilesByProjectIdAndParentIdsHandler} from "./functions/listFilesByProjectIdAndParentIds/resource";

const backend = defineBackend({
  auth,
  storage,
  data,
  listFilesByProjectIdAndParentIdsHandler
});

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