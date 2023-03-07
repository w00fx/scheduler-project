"use strict";
const Scheduler = require('aws-sdk/clients/scheduler');
const DynamoDB = require('aws-sdk/clients/dynamodb')
const SchedulerClient = new Scheduler();
const dynamoClient = new DynamoDB.DocumentClient();

const {TABLE_NAME} = process.env

const deleteScheduler = async (item) => {
    var params = {
        Name: item.schedule_name
      };
      try {
        const resp = await SchedulerClient.deleteSchedule(params).promise();
        console.log(resp);
        console.log(`Schedule ${item.schedule_name} deleted successfully.`);
        return [true, '']
      } catch (err) {
        console.error(`Error deleting schedule. Error: ${err.message}`);
        return [false, `Error deleting schedule ${item.schedule_name}`];
      }
};

const deleteItemDynamo = async (item) => {
    var params = {
        TableName : TABLE_NAME,
        Key: {
          type: item.type,
          identifier: item.identifier
        }
      };

      try {
        const resp = await dynamoClient.delete(params).promise();
        console.log(resp);
        console.log(`Schedule ${item.schedule_name} deleted successfully.`);
        return [true, `Schedule ${item.schedule_name} deleted successfully.`];
      } catch (error) {
        console.error(`Error deleting item in table. Error: ${error.message}`);
        return [false, `Error deleting item in table. Schedule: ${item.schedule_name}`];
      }
      
};

const sendToKafka = async (item) => {
    console.log(`Item send to Kafka: ${item}`);
};

exports.handler = async (event) => {
    const final_return = {
        statusCode: 200,
        body: ''
    }

    console.log(JSON.stringify(event));

    await sendToKafka(event);

    let [isWrite, message] = await deleteScheduler(event);

    if (isWrite) {
        [isWrite, message] = await deleteItemDynamo(event);
        if (isWrite) {
            final_return.body = message;
            return final_return
        } else {
            final_return.statusCode = 500;
            final_return.body = message;
        }
    } else {
        final_return.statusCode = 500
        final_return.body = message
        return final_return
    }
};