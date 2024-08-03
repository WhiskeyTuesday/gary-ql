const gql = require('graphql-tag');

module.exports = gql`
  type SalesAgent {
    id: ID!
    status: String!
    profile: SalesAgentProfile!
    leads: [Lead]!
    jobs: [Job]!
    allLeads: [Lead]!
    allJobs: [Job]!
  }

  type SalesAgentProfile {
    id: ID!
    firstName: String!
    lastName: String!
    emailAddress: String!
    phoneNumber: String!
  }
`;
