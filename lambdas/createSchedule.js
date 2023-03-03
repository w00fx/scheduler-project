"use strict";
const Scheduler = require('aws-sdk/clients/scheduler');
const DynamoDB = require('aws-sdk/clients/dynamodb')
const SchedulerClient = new Scheduler();
const uuid = require('uuid');

const {EXECUTE_ARN, ROLE_ARN, TABLE_NAME} = process.env

const writeToDynamo = (scheduler_input, body) => {
    const dynamoClient = new DynamoDB.DocumentClient();
    const params = {
        TableName: TABLE_NAME,
        Item: {
            ...scheduler_input,
            status: 'PENDING',
            trigger_time: body.trigger_time,
            custom_attributes: body.custom_attributes
        }
    }
    dynamoClient.put(params, function(err, data) {
        if (err) console.log(`Error: ${err}`);
        else console.log(`Object written in DynamoDB.`);
    });
}

exports.handler = async (event) => {
    const body = JSON.parse(event.body);
    const name = uuid.v4();

    const input = {
        type: body.type,
        identifier: body.identifier,
        schedule_name: name,
        payload: body.payload,
    }

    const resp = await SchedulerClient.createSchedule({
        Name: name,
        ScheduleExpression: `at(${body.trigger_time})`,
        FlexibleTimeWindow: {
            Mode: 'OFF'
        },
        Target: {
            Arn: EXECUTE_ARN,
            RoleArn: ROLE_ARN,
            Input: JSON.stringify(input)
        }
    }).promise()
    console.log(`Schedule created. Arn: ${resp.ScheduleArn}`)
    await writeToDynamo(input, body);

    return {
        statusCode: 200,
        body: resp.ScheduleArn
    }
};