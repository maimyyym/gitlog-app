import { DynamoDB } from "aws-sdk"

const dynamoDB = new DynamoDB.DocumentClient();

const params = {
  TableName: 'next-auth',
  Key: {
  }
}

exports.handler = async (event: any) => {
  console.log(event);
}
