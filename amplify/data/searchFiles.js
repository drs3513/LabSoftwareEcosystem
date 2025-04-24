import { util } from "@aws-appsync/utils";

/**
 * Searches for documents by list of fileNames, and tagNames using substring match
 * @arguments : {fileNames: string[], tagNames: string[], authorId: string[]}
 * authorNames is not currently implemented
 * @returns all found files
 */
export function request(ctx) {
    return {
        operation: "Query",

        query: {
            expression: "projectId = :projectId",
            expressionValues: util.dynamodb.toMapValues({":projectId": ctx.arguments.projectId})
        },
        index: "byProject"
    };
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

    //Callback functions which filter all files with projectId 'args.projectId' by only those which have the input tagNames, or fileNames
    return ctx.result.items.filter((file) =>
        ctx.arguments.tagNames.length === 0 ||
        (file.tags && file.tags.length !== 0 &&
            ctx.arguments.tagNames.some((searchTagName) =>
                file.tags.some((fileTagName) =>
                    fileTagName.toLowerCase().includes(searchTagName.toLowerCase())))))
        .filter((file) =>
            ((ctx.arguments.fileNames.length === 0 ||
                ctx.arguments.fileNames.some((fileName) =>
                    file.filename.toLowerCase().includes(fileName.toLowerCase()))))).filter((file) => file.isDeleted === 0)
}

/*
ctx.arguments.tagNames.length === 0 ||
            (file.tags && file.tags.length !== 0 &&
                ctx.arguments.tagNames.some((searchTagName) =>
                file.tags.some((fileTagName) =>
                    fileTagName.includes(searchTagName)))))
        &&
 */

/*
((file) =>
        ((ctx.arguments.fileNames.length === 0 ||
            ctx.arguments.fileNames.some((fileName) =>
                file.filename.includes(fileName)))))
 */