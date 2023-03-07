"use strict";
const Scheduler = require('aws-sdk/clients/scheduler');
const DynamoDB = require('aws-sdk/clients/dynamodb')
const SchedulerClient = new Scheduler();
const dynamoClient = new DynamoDB.DocumentClient();

const {TABLE_NAME} = process.env

const deleteScheduler = async (schedule_name) => {
    var params = {
        Name: schedule_name
      };
      try {
        const resp = await SchedulerClient.deleteSchedule(params).promise();
        console.log(`Schedule ${schedule_name} deleted successfully.`);
        return [true, `Schedule ${schedule_name} deleted successfully.`];
      } catch (err) {
        console.error(`Error deleting schedule. Error: ${err.message}`);
        return [false, `Error deleting schedule ${schedule_name}`];
      }
};

const deleteItemDynamo = async (item) => {
    var params = {
        TableName : TABLE_NAME,
        Key: {
          type: item.type,
          identifier: item.identifier
        },
        ReturnValues: 'ALL_OLD'
      };

      try {
        const resp = await dynamoClient.delete(params).promise();
        console.log(`Item type: ${item.type} identifier: ${item.identifier} deleted successfully.`);
        return resp.Attributes.schedule_name;
      } catch (error) {
        console.error(`Error deleting item in table. Error: ${error.message}`);
        return false;
      }
};

exports.handler = async (event) => {
    const final_return = {
        statusCode: 200,
        body: ''
    };
    const body = JSON.parse(event.body);

    const schedule_name = await deleteItemDynamo(body);
    if (schedule_name) {
        let [isDeleted, message] = await deleteScheduler(schedule_name);
        if (isDeleted) {
            final_return.body = message;
            return final_return;
        } else {
            final_return.body = message;
            final_return.statusCode = 500;
            return final_return;
        }
    } else {
        final_return.statusCode = 500;
        final_return.body = 'Fail deleting schedule in Dynamo table.';
        return final_return;
    }
};