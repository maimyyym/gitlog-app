import { DynamoDBAdapter } from "@auth/dynamodb-adapter";
import { DynamoDB, DynamoDBClientConfig } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";
import axios from "axios";
import type { NextApiRequest, NextApiResponse } from "next";
import { NextAuthOptions } from "next-auth";
import { Adapter } from "next-auth/adapters";
import NextAuth from "next-auth/next";
import GitHubProvider from "next-auth/providers/github";
import {signIn} from "next-auth/react";

const config: DynamoDBClientConfig = {
  credentials: {
    accessKeyId: process.env.NEXT_AUTH_AWS_ACCESS_KEY as string,
    secretAccessKey: process.env.NEXT_AUTH_AWS_SECRET_KEY as string,
  },
  region: process.env.NEXT_AUTH_REGION,
};

const client = DynamoDBDocument.from(new DynamoDB(config), {
  marshallOptions: {
    convertEmptyValues: true,
    removeUndefinedValues: true,
    convertClassInstanceToMap: true,
  },
});
const options: NextAuthOptions = {
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_ID || "",
      clientSecret: process.env.GITHUB_SECRET || "",
      authorization: {
        params: {
          scope: "read:user user:email repo admin:repo_hook"
        }
      }
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (account) {
        token.accessToken = account.access_token;
      }
      console.log("token:" + token);
      return token;
    },
    async session({ session, token, user }) {
      if (token) {
        session.user.token = token.accessToken as string; // asはあんまり？
      }
      return session;
    },
  },
  events: {
    async signIn(message) {
      if (message && message.user && message.account) {
        const accessToken = message.account.access_token as string;
        const USER_NAME = message.user.name;

        const setWebhookForUser = async (token: string) => {
          const GITHUB_API_URL = 'https://api.github.com';
          const USER_ACCESS_TOKEN = token;

          const webhookConfig = {
            name: 'GitLogAppWebhook',
            active: true,
            events: ['push'],
            config: {
              url: 'https://krfljuebzob6lgar65pznkghs40jyege.lambda-url.ap-northeast-1.on.aws/', //仮！
              content_type: 'json'
            }
          };

          try {
            const response = await axios.post(
              `${GITHUB_API_URL}/repos/${USER_NAME}/github-dialy/hooks`,
            webhookConfig,
            {
              headers: {
                Authorization: `Bearer ${USER_ACCESS_TOKEN}`,
                Accept: 'application/vnd.github+json'
              }
            });
            return response.data;
          } catch (error) {
             console.error('Error adding webhook:', error);
            throw error;
          }
        };

        await setWebhookForUser(accessToken);
      }
    }
  },
  adapter: DynamoDBAdapter(client) as Adapter,
};

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  return NextAuth(req, res, options);
};

export default handler;
