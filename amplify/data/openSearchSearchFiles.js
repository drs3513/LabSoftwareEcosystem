import { util } from "@aws-appsync/utils";

/**
 * Searches for documents by list of fileNames, and tagNames using substring match
 * @arguments : {fileNames: string[], tagNames: string[], authorId: string[]}
 * authorNames is not currently implemented
 * @returns all found files
 *
 * Note : uses wildcard expressions, which are computationally expensive, but are significantly more efficient for storage
 * than an N-gram tokenizer. (N-gram tokenizers required O(n^3) tokens for a table with n attributes)
 * The logic is that search queries will not be performed often, so it is better to save money by letting the search function
 * be a little slower than it'd be otherwise. (Additionally, N-gram tokenizers require preset 'gram' sizes, i.e. sizes 3, 4, and 5,
 */
export function request(ctx) {

    return {
        operation: "GET",
        path: "/file/_search",
        params: {
            body: {
                query: {
                    bool: {
                        should:[


                            ...ctx.arguments.fileNames.map(fileName => (
                                {
                                wildcard: {
                                    filename: {
                                        value: `*${fileName}*`,
                                        case_insensitive: true
                                    }
                                }
                            }
                            )),
                            ...ctx.arguments.tagNames.map(tagName => (
                                {
                                    wildcard: {
                                        tags: {
                                            value: `*${tagName}*`,
                                            case_insensitive: true
                                        }
                                    }
                                }
                            ))]
                    }
                }
            }
        }
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