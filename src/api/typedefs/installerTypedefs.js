const gql = require('graphql-tag');

module.exports = gql`
  type Installer {
    id: ID!
    profile: InstallerProfile!
    assignments: [Job]!
  }

  type InstallerProfile {
    id: ID!
    firstName: String!
    lastName: String!
    emailAddress: String!
    phoneNumber: String!
  }

  extend type Mutation {
    markWindowsComplete(jobId: ID!, windowIds: [ID!]!): String
  }
`;
