"use strict";
const Scheduler = require('aws-sdk/clients/scheduler');
const SchedulerClient = new Scheduler();

const EXECUTE_ARN = ''
const ROLE_ARN = ''

exports.handler = async (event) => {
    const resp = await SchedulerClient.createSchedule({
        Name: '',
        ScheduleExpression: `at(2023-11-20T20:00:00)`,
        FlexibleTimeWindow: {
            Mode: 'OFF'
        },
        Target: {
            Arn: EXECUTE_ARN,
            RoleArn: ROLE_ARN,
            Input: JSON.stringify({
                data: 'data'
            })
        }
    }).promise()
    print(JSON.stringify(resp))

    return {
        statusCode: 200,
        body: resp.ScheduleArn
    }
};