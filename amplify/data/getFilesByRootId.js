import { util } from "@aws-appsync/utils";

/**
 * Searches for documents by list of fileNames, and tagNames using substring match
 * @arguments : {fileNames: string[], tagNames: string[], authorId: string[]}
 * authorNames is not currently implemented
 * @returns all found files
 */
export function request(ctx) {

    return {
        operation: "BatchGetItem",

        tables: {
            [`File-${ctx.stash.awsAppsyncApiId}-${ctx.stash.amplifyApiEnviromentName}`]: {
                keys: ctx.args.rootIds.map((rootId) => ({
                    fileId: { S: rootId },  // Explicitly specify the type as String
                    projectId: { S: ctx.args.projectId }  // Explicitly specify the type as String
                }))
            }
        }
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
