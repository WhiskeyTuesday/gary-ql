const gql = require('graphql-tag');

module.exports = gql`
  extend type Query {
    agentWithCharacteristics(mode: String! count: Int): [Agent]
    jsonAggregatesWithCharacteristics(mode: String! count: Int): [String]
    token(iss: String! aud: String! sub: ID! imp: Boolean): ID
    tokenById(id: ID! type: String! imp: Boolean): ID
    firebaseUsers: [ID]!
    generatorState: String

    staff(id: ID!): Staff
    admin(id: ID!): Admin
  }

  extend type Mutation {
    suCreateStaff(memo: String!, details: StaffInput!): ID
    suCreateAdmin(memo: String!, details: AdminInput!): ID

    suAssociateToken(token: TokenInput! id: ID!, type: String!): String
    clearCounter: String
    changeCounterMode(mode: Int!): String
    resetServer(unixTime: Int): String
    resetTestData: String
    pause: String
    resume: String
    dump(local: Boolean! dumpName: String!): String
    load(local: Boolean! consolidated: Boolean dumpName: String!): String,

    fastForward(
      unixTime: Int
      unixTimeString: String
      hours: Int
      minutes: Int
      seconds: Int
      volume: Int
    ): String

    testNotification(userId: ID! type: String): String
  }
`;
