"use strict";

exports.handler = async (event) => {
    console.log('EXECUTED SUCCESSFULLY.');
    console.log(JSON.stringify(event));

    return {
        statusCode: 200,
        body: 'EXECUTED SUCCESSFULLY.'
    }
};