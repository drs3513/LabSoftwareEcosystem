import { util } from "@aws-appsync/utils";

/**
 * Request resolver: queries messages by fileId (first page only).
 */
export function request(ctx) {
  return {
    operation: "Query",
    index: "messagesByFileIdAndPagination",
    query: {
      expression: "fileId = :fileId",
      expressionValues: util.dynamodb.toMapValues({
        ":fileId": ctx.arguments.fileId,
      }),
    },
  };
}

/**
 * Response resolver: deletes each message in the results.
 */
export function response(ctx) {
  if (ctx.error) {
    util.appendError(ctx.error.message, ctx.error.type);
  }

  const items = ctx.result.items ?? [];

  for (const item of items) {
    util.dynamodb.delete({
      key: {
        messageId: item.messageId,
      },
      tableName: util.env.get("DATA_Message_TABLE_NAME"),
    });
  }

  return { deletedCount: items.length };
}
