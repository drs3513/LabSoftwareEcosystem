import { util } from "@aws-appsync/utils";

/**
 * Searches for documents by list of messageContents, and tagNames using substring match
 * @arguments : {messageContents: string[], tagNames: string[], authorId: string[]}
 * @returns all found messages
 */
export function request(ctx) {
    console.log("ctx arguments", JSON.stringify(ctx.arguments));
    return {
        operation: "Query",
        query: {
            expression: "projectId = :projectId",
            expressionValues: util.dynamodb.toMapValues({":projectId": ctx.arguments.projectId })
        },
        index: "messagesByProjectIdAndPagination"
    };
}


/**
 * Returns the fetched items
 * @param {import('@aws-appsync/utils').Context} ctx the context
 * @returns {*} the result
 */
export function response(ctx) {
    if (ctx.error) {
        util.appendError("Error in response", "string");
        util.appendError(ctx.error.message, ctx.error.type);
        util.appendError(JSON.stringify(ctx.result), "string")
        return [];
    }

    //callback functions which filter all messages with fileId 'args.fileId' by only those which have the input tagNames, or messages
    return ctx.result.items.filter((message) =>
        ctx.arguments.tagNames.length === 0 ||
        (message.tags &&
            ctx.arguments.tagNames.some((searchTagName) =>
                message.tags.some((messageTagName) =>
                    messageTagName.toLowerCase().includes(searchTagName.toLowerCase())))))
        .filter((message) =>
            (ctx.arguments.messageContents.length === 0 ||
                ctx.arguments.messageContents.some((messageContent) =>
                    message.content.toLowerCase().includes(messageContent.toLowerCase()))))

}
