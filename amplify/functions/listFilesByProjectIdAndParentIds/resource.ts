import {defineFunction} from '@aws-amplify/backend';

export const listFilesByProjectIdAndParentIdsHandler = defineFunction({
    entry: './handler.js'
})