import { DynamoDBClient, QueryCommand } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { graphql } from "@octokit/graphql";

const dynamoDB = new DynamoDBClient({});

const extractRepoInfo = (eventBody: string) => { // anyは使いたくない, unknownはここ？？→stringなの？
  const body = JSON.parse(eventBody || "{}");
  console.log('body:' + body);
  const pusherEmail = body.pusher && body.pusher.email; // この演算子の意味は？
  console.log(pusherEmail)
  return { pusherEmail };
};

const getIdByEmailInDynamoDB = async (email: string) => {
  const command = new QueryCommand({
    TableName: "next-auth",
    IndexName: "GSI1",
    KeyConditionExpression: "GSI1PK = :email",
    ExpressionAttributeValues: {
      ":email": { S: `USER#${email}` },
    },
    ProjectionExpression: "id, #name",
    ExpressionAttributeNames: {
      "#name" : "name"
    }
  });

  const response = await dynamoDB.send(command);
  if (response && response.Items && response.Items.length > 0) {
    const id = response.Items[0].id.S;
    const name = response.Items[0].name.S;
    return { id, name };
  } else {
    return undefined;
  }
};

const getTokenById = async (id: string) => {
  const command = new QueryCommand({
    TableName: "next-auth",
    KeyConditionExpression: "pk = :pk and begins_with(sk, :sk)",
    ExpressionAttributeValues: {
      ":pk": {
        S: `USER#${id}`
      },
      ":sk": {
        S: "ACCOUNT"
      }
    },
    ProjectionExpression: "access_token"
  });
  const response = await dynamoDB.send(command);
  if (response && response.Items && response.Items.length > 0) {
    return response.Items[0].access_token.S;
  } else {
    return "access_token: undefined"
  }
};


export const handler = async (event: any = {}): Promise<any> => {
  const eventBody = event.body;
  const repoInfo = extractRepoInfo(eventBody);
  const user = await getIdByEmailInDynamoDB(repoInfo.pusherEmail);
  const id = user?.id; // undefinedのハンドリング
  const name = user?.name; // undefinedのハンドリング
  const token = await getTokenById(id as string); // アサーションはあまり使いたくない。undefinedをハンドリングする。

  // tokenを使ってリポジトリからリポジトリ名を取得。

  const graphqlWithAuth = graphql.defaults({
  headers: {
    authorization: `bearer ${token}`
  }
})

  const entries: any = await graphqlWithAuth(
    `
    {
      repository(owner: "${name}", name: "github-dialy") {
        object(expression: "main:") {
          ... on Tree {
            entries {
              name
              type
              path
            }
          }
        }
      }
    }
    `
  )
  const filePath = entries.repository.object.entries[1].path

  const textData = await graphqlWithAuth(
    `
    {
      repository(owner: "${name}", name: "github-dialy") {
        object(expression: "main:${filePath}") {
          ... on Blob {
            text
            oid
          }
        }
      }
    }
    `
  )

  console.log('entries:' + JSON.stringify(entries));

  console.log("textData: " + JSON.stringify(textData));

  return { statusCode: 200, body: "token:" + token };
};

