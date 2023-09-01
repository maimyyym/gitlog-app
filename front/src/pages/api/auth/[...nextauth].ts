import { DynamoDBAdapter } from "@auth/dynamodb-adapter";
import { DynamoDB, DynamoDBClientConfig } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";
import type { NextApiRequest, NextApiResponse } from "next";
import { NextAuthOptions } from "next-auth";
import { Adapter } from "next-auth/adapters";
import NextAuth from "next-auth/next";
import GitHubProvider from "next-auth/providers/github";

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
  adapter: DynamoDBAdapter(client) as Adapter,
};

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  return NextAuth(req, res, options);
};

export default handler;
