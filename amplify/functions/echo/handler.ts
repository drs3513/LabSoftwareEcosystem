import type { Handler } from 'aws-lambda';

export const handler: Handler = async (event, context) => {
    // your function code goes here


    return {
        content: "Hello World",
        executionDuration: 2.5
    };
};