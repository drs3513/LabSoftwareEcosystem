import { util } from "@aws-appsync/utils";

/**
 * Fetch messages by fileId, paginated with limit (default 10), and support for nextToken.
 */
export function request(ctx) {
    const { projectId, limit = 100, nextToken } = ctx.arguments;

    return {
        operation: "Query",
        index: "messagesByProjectIdAndPagination",
        query: {
            expression: "projectId = :projectId",
            expressionValues: util.dynamodb.toMapValues({
                ":projectId": projectId
            })
        },
        limit,
        nextToken,
        scanIndexForward: false // DESCENDING order
    };
}

export function response(ctx) {
    if (ctx.error) {
        util.appendError(ctx.error.message, ctx.error.type);
    }

    return {
        items: ctx.result.items ?? [],
        nextToken: ctx.result.nextToken ?? null
    };

}
