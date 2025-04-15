import { util } from "@aws-appsync/utils";

/**
 * Searches for documents by list of fileNames, and tagNames using substring match
 * @arguments : {fileNames: string[], tagNames: string[], authorId: string[]}
 * authorNames is not currently implemented
 * @returns all found files
 */
export function request(ctx) {

    return {
        operation: "TransactWriteItems",

        transactItems:
            ctx.arguments.fileIds.map((fileId, i) => ({
                table: `File-${ctx.stash.awsAppsyncApiId}-NONE`,
                operation: 'UpdateItem',
                key: util.dynamodb.toMapValues({fileId: fileId, projectId: ctx.arguments.projectId}),
                update: {
                    expression: "SET filepath = :fp, parentId = :pid",
                    expressionValues: util.dynamodb.toMapValues({":fp": ctx.arguments.filepaths[i], ":pid": ctx.arguments.parentIds[i]})
                }

            })),
    }
}


/**
 * Returns the fetched items
 * @param {import('@aws-appsync/utils').Context} ctx the context
 * @returns {*} the result
 */
export function response(ctx) {
    if (ctx.error) {
        util.appendError(ctx.error.message, ctx.error.type);
    }
    return ctx.result

}
