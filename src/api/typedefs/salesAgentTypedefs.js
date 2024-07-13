const gql = require('graphql-tag');

module.exports = gql`
  type SalesAgent {
    id: ID!
    profile: SalesAgentProfile!
    settings: SalesAgentSettings!
    leads: [Lead]!
    jobs: [Job]!
    allLeads: [Lead]!
    allJobs: [Job]!
  }

  type SalesAgentProfile {
    id: ID!
    firstName: String!
    lastName: String!
  }

  type SalesAgentSettings {
    placeholder: Boolean!
  }

  extend type Mutation {
    sendProposal(jobId: ID! stageIds: [ID!]!): String
    cancelProposal(jobId: ID! proposalId: ID!): String
    supercedeProposal(jobId: ID! stageIds: [ID!]!): String
  }
`;
