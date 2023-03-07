"use strict";
const Scheduler = require('aws-sdk/clients/scheduler');
const DynamoDB = require('aws-sdk/clients/dynamodb')
const SchedulerClient = new Scheduler();
const uuid = require('uuid');
const dynamoClient = new DynamoDB.DocumentClient();

const {EXECUTE_ARN, ROLE_ARN, TABLE_NAME} = process.env

const writeToDynamo = async (items) => {
    const params = {
        TransactItems: items
    };
    try {
        await dynamoClient.transactWrite(params).promise();
        return [true, '']
    } catch (error) {
        if (error.code === "TransactionCanceledException") {
            console.error(`One or more items already exists in table. Error: ${error.message}`);
            return [false, 'One or more items already exists in table.']
        }
        else {
            console.error(`Unexpected error. Error: ${error.message}`);
            return [false, 'Unexpected error.']
        }
    };
};

const createTransactions = (items) => {
    const transactions = items.map(item => {
        return {
            Put: {
                TableName: TABLE_NAME,
                Item: {
                    ...item,
                    status: 'PENDING',
                    schedule_name: uuid.v4()
                },
                ConditionExpression: 'attribute_not_exists(#type)',
                ExpressionAttributeNames: {
                    '#type': 'type'
                },
            }
        }
    });
    return transactions;
};

const createSchedules = async (items) => {
    const created_schedules = [];
    const failed_schedules = [];
    for (const item of items) {
        const input = {
            type: item.Put.Item.type,
            identifier: item.Put.Item.identifier,
            schedule_name: item.Put.Item.schedule_name,
            payload: item.Put.Item.payload,
        }

        try {
            const resp = await SchedulerClient.createSchedule({
                Name: item.Put.Item.schedule_name,
                ScheduleExpression: `at(${item.Put.Item.trigger_time})`,
                FlexibleTimeWindow: {
                    Mode: 'OFF'
                },
                Target: {
                    Arn: EXECUTE_ARN,
                    RoleArn: ROLE_ARN,
                    Input: JSON.stringify(input)
                }
            }).promise();
            created_schedules.push(resp.ScheduleArn);
            console.log(`Schedule created. Arn: ${resp.ScheduleArn}`);
        } catch (error) {
            console.log(`Error has happened. Error: ${error.message}`);
            failed_schedules.push(input);
        }
    };
    if (failed_schedules.length > 0) {
        return [false, {
            message: "Schedules failed.",
            failed_schedules: failed_schedules,
            succeded_schedules: created_schedules
        }]
    } else {
        return [true, {
            message: "Schedules created.",
            failed_schedules: failed_schedules,
            succeded_schedules: created_schedules
        }]
    }
};

exports.handler = async (event) => {
    const final_return = {
        statusCode: 201,
        body: ''
    }
    // console.log(JSON.stringify(event));
    const body = JSON.parse(event.body);

    const transactions = createTransactions(body);
    console.log(JSON.stringify(transactions));

    let [isWrite, message] = await writeToDynamo(transactions);

    console.log(isWrite);
    if (isWrite) {
        [isWrite, message] = await createSchedules(transactions);

        if (isWrite) {
            final_return.body = JSON.stringify(message);
            return final_return;
        } else {
            final_return.body = JSON.stringify(message);
            final_return.statusCode = 500;
            return final_return;
        }
    } else {
        if (message === 'Unexpected error.') {
            final_return.statusCode = 500;
            final_return.body = message;
            return final_return;
        } else {
            final_return.statusCode = 409;
            final_return.body = message;
            return final_return;
        }
    }
};