const gql = require('graphql-tag');

module.exports = gql`
  type Staff {
    id: ID!
    userId: ID!
    token: Token!
    status: String!
    profile: StaffProfile!
    leads: [Lead]!
    jobs: [Job]!
  }

  type StaffProfile {
    id: ID!
    firstName: String!
    lastName: String!
    emailAddress: String!
    phoneNumber: String!
  }

  extend type Query {
    staffSelf: Staff
  }

  input StaffSettingsInput {
    placeholder: Boolean
  }

  extend type Mutation {
    staffChangeSettings(settings: StaffSettingsInput!): String
    assignSalesAgent(leadId: ID!, salesAgentId: ID!): String
    unassignSalesAgent(jobId: ID!): String
    assignInstallers(jobId: ID!, installerIds: [ID]!): String
    unassignInstallers(jobId: ID!, installerIds: [ID]!): String
  }
`;
