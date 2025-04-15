import { defineFunction } from '@aws-amplify/backend';

export const batchGetFiles = defineFunction({
  name: 'batchGetFiles',
  entry: './handler.ts',
});