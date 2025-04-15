import { util } from "@aws-appsync/utils";

/**
 * Searches for documents by using an input term
 * @param {import('@aws-appsync/utils').Context} ctx the context
 * @returns {*} the request
 */
export function request(ctx) {

    return {
        operation: "GET",
        path: "/file/_search"
    };
}


/**
 * Returns the fetched items
 * @param {import('@aws-appsync/utils').Context} ctx the context
 * @returns {*} the result
 */
export function response(ctx) {
    if (ctx.error) {
        util.error(ctx.error.message, ctx.error.type);
    }
    //util.error(ctx.result.tokens.map(t=>t.token).join(",", "string"))
    //return Object.keys(ctx.result)
    return ctx.result.hits.hits.map((hit) => hit._source)
}