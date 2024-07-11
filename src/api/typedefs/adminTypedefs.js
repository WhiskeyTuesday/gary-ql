const gql = require('graphql-tag');

module.exports = gql`
  type Admin {
    id: ID!
    profile: AdminProfile!
    settings: AdminSettings!
  }

  type AdminProfile {
    id: ID!
    firstName: String!
    lastName: String!
  }

  type AdminSettings {
    placeholder: Boolean!
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

  input MaterialInput {
    name: String!
    supplierName: String!
    priceSqFt: CurrencyInput!
    costSqFt: CurrencyInput!
  }

  extend type Mutation {
    createMaterial(details: MaterialInput!): ID!
    editMaterial(details: MaterialInput!): ID!
    deprecateMaterial(id: ID!): Boolean!
    reinstateMaterial(id: ID!): Boolean!

    createStaff(details: StaffInput!): ID!
    editStaff(id: ID! details: StaffInput!): Boolean!
    deactivateStaff(id: ID!): Boolean!
    reactivateStaff(id: ID!): Boolean!

    createSalesAgent(details: SalesAgentInput!): ID!
    editSalesAgent(id: ID! details: SalesAgentInput!): Boolean!
    deactivateSalesAgent(id: ID!): Boolean!
    reactivateSalesAgent(id: ID!): Boolean!

    createInstaller(details: InstallerInput!): ID!
    editInstaller(id: ID! details: InstallerInput!): Boolean!
    deactivateInstaller(id: ID!): Boolean!
    reactivateInstaller(id: ID!): Boolean!
  }
`;
