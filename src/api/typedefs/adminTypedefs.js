const gql = require('graphql-tag');

module.exports = gql`
  type Admin {
    id: ID!
    status: String!
    profile: AdminProfile!
    leads: [Lead]!
    jobs: [Job]!
  }

  type AdminProfile {
    id: ID!
    firstName: String!
    lastName: String!
    emailAddress: String!
    phoneNumber: String!
  }

  input StaffInput {
    firstName: String!
    lastName: String!
    emailAddress: String!
    phoneNumber: String!
  }

  input SalesAgentInput {
    firstName: String!
    lastName: String!
    emailAddress: String!
    phoneNumber: String!
  }

  input InstallerInput {
    firstName: String!
    lastName: String!
    emailAddress: String!
    phoneNumber: String!
  }

  enum MaterialUnit {
    SQ_FT
    SQ_M
  }

  enum CurrencyCode {
    USD
  }

  input MaterialInput {
    name: String!
    price: Int!
    unit: MaterialUnit!
    currencyCode: CurrencyCode!
  }

  # TODO respond with the actual aggregate for optemistic UI
  extend type Mutation {
    createMaterial(details: MaterialInput!): String!
    editMaterial(id: ID! details: MaterialInput!): String!
    deprecateMaterial(id: ID!): String!
    reinstateMaterial(id: ID!): String!

    createStaff(details: StaffInput!): String!
    editStaff(id: ID! details: StaffInput!): String!
    deactivateStaff(id: ID!): String!
    reactivateStaff(id: ID!): String!

    createSalesAgent(details: SalesAgentInput!): String!
    editSalesAgent(id: ID! details: SalesAgentInput!): String!
    deactivateSalesAgent(id: ID!): String!
    reactivateSalesAgent(id: ID!): String!

    createInstaller(details: InstallerInput!): String!
    editInstaller(id: ID! details: InstallerInput!): String!
    deactivateInstaller(id: ID!): String!
    reactivateInstaller(id: ID!): String!
  }
`;
