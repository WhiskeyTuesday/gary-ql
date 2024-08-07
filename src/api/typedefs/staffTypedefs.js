const gql = require('graphql-tag');

module.exports = gql`
  type Staff {
    id: ID!
    status: String!
    userId: ID!
    token: Token!
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
`;
