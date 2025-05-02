import { util } from "@aws-appsync/utils";

/**
 * Fetches messages by a given projectId using the "messagesByProjectIdAndPagination" index.
 * Results are paginated, support descending order, and can include a nextToken for pagination.
 *
 * @arguments
 *   - projectId {string} (required): The ID of the project to retrieve messages for.
 *   - limit {number} (optional): The maximum number of items to return (default is 100).
 *   - nextToken {string} (optional): Token for fetching the next page of results.
 *
 * @returns A DynamoDB query request with pagination and descending sort order.
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

/**
 * Handles the response from the DynamoDB query operation.
 *
 * @param {import('@aws-appsync/utils').Context} ctx - The AppSync resolver context.
 * @returns {Object} An object containing the retrieved items and nextToken (if any).
 */
export function response(ctx) {
    if (ctx.error) {
        util.appendError(ctx.error.message, ctx.error.type);
    }

    return {
        items: ctx.result.items ?? [],
        nextToken: ctx.result.nextToken ?? null
    };

}
