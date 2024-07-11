const gql = require('graphql-tag');

module.exports = gql`
  type SalesAgent {
    id: ID!
    profile: SalesAgentProfile!
    settings: SalesAgentSettings!
  }

  type SalesAgentProfile {
    id: ID!
    firstName: String!
    lastName: String!
  }

  type SalesAgentSettings {
    placeholder: Boolean!
  }

  input WindowInput {
    location: String!
    type: WindowType!
    glassType: GlassType!
    width: Int!
    height: Int!
  }

  input StageInput {
    windows: [WindowInput!]!

    notes: String
  }

  input JobInput {
    materials: [ID!]!
    stages: [StageInput!]!

    notes: String
  }

  extend type Mutation {
    sendProposal(jobId: ID! stageIds: [ID!]!): String
    cancelProposal(jobId: ID! proposalId: ID!): String
    supercedeProposal(jobId: ID! stageIds: [ID!]!): String
  }
`;
