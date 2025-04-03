import {util} from '@aws-appsync/utils';

export function request(ctx) {
    const {projectId, parentIds} = ctx.args
    return {
        operation: 'Query',
        query: {
            expression: 'projectId = :projectId'
        }
    }
}

export function response(ctx) {
    const { error, result } = ctx;
    if (error) {
        if (!ctx.stash.errors) ctx.stash.errors = []
        ctx.stash.errors.push(ctx.error)
        return util.appendError(error.message, error.type, result);
    }
    return ctx.result
}