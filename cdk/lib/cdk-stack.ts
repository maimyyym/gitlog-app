import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import {NodejsFunction} from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';

export class CdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const NextAuthTable = new dynamodb.Table(this, `NextAuthTable`, {
  tableName: "next-auth",
  partitionKey: { name: "pk", type: dynamodb.AttributeType.STRING },
  sortKey: { name: "sk", type: dynamodb.AttributeType.STRING },
  timeToLiveAttribute: "expires",
});
 NextAuthTable.addGlobalSecondaryIndex({
  indexName: "GSI1",
  partitionKey: { name: "GSI1PK", type: dynamodb.AttributeType.STRING },
  sortKey: { name: "GSI1SK", type: dynamodb.AttributeType.STRING },
});

  const GetPushNotificationFunction = new NodejsFunction(this, 'GetPushNotificationFunction', {
    runtime: lambda.Runtime.NODEJS_18_X,
    entry: path.join(__dirname, "../functions/index.ts"),
    handler: "handler"
  });

  NextAuthTable.grantReadData(GetPushNotificationFunction);
  }
}
