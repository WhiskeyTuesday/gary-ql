const gql = require('graphql-tag');

module.exports = gql`
  type Installer {
    id: ID!
    profile: InstallerProfile!
    settings: InstallerSettings!
  }

  type InstallerProfile {
    id: ID!
    firstName: String!
    lastName: String!
  }

  type InstallerSettings {
    placeholder: Boolean!
  }

  extend type Mutation {
    markWindowComplete(jobId: ID!, windowId: ID!): String
  }
`;
