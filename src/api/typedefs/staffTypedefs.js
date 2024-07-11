const gql = require('graphql-tag');

module.exports = gql`
  type StaffSettings {
    contactPhoneNumber: String
    contactEmailAddress: String
    mailingAddress: String
  }

  type Staff {
    id: ID!
    userId: ID!
    token: Token!
    status: String!
    workList: [WorkItem]
    profile: StaffProfile!
    settings: StaffSettings!
  }

  type StaffProfile {
    id: ID!
    firstName: String!
    lastName: String!
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
