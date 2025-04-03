import {defineFunction} from '@aws-amplify/backend';

export const echoHandler = defineFunction({
    entry: './handler.js'
})