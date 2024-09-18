const gql = require('graphql-tag');

module.exports = gql`
  type Installer {
    id: ID!
    status: String!
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
`;
