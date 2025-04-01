import {util} from '@aws-appsync/utils'

export function request(ctx: any) {
    var now = util.time.nowISO8601();

    return {
        operation: "BatchUpdateItem",
        tables: {
            
        }

    }


}