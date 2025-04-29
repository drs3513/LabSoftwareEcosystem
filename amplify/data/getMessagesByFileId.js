import { util } from "@aws-appsync/utils";

/**
 * Fetch messages by fileId, paginated with limit (default 10), and support for nextToken.
 */
export function request(ctx) {
  const { fileId, limit = 100, nextToken } = ctx.arguments;

  return {
    operation: "Query",
    index: "messagesByFileIdAndPagination",
    query: {
      expression: "fileId = :fileId",
      expressionValues: util.dynamodb.toMapValues({
        ":fileId": fileId
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
