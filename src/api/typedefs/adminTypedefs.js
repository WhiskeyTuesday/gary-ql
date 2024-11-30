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

  input AdminInput {
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

  type NewAccountDetails {
    admin: Admin
    staff: Staff
    installer: Installer
    salesAgent: SalesAgent

    password: String!
    alreadyExists: Boolean!
  }

  # TODO respond with the actual aggregate for optemistic UI
  extend type Mutation {
    createMaterial(details: MaterialInput!): Material
    editMaterial(id: ID! details: MaterialInput!): Material
    deprecateMaterial(id: ID!): Material
    reinstateMaterial(id: ID!): Material

    createAdmin(details: AdminInput!): NewAccountDetails
    editAdmin(id: ID! details: AdminInput!): Admin
    deactivateAdmin(id: ID!): Admin
    reactivateAdmin(id: ID!): Admin

    createStaff(details: StaffInput!): NewAccountDetails
    editStaff(id: ID! details: StaffInput!): Staff
    deactivateStaff(id: ID!): Staff
    reactivateStaff(id: ID!): Staff

    createSalesAgent(details: SalesAgentInput!): NewAccountDetails
    editSalesAgent(id: ID! details: SalesAgentInput!): SalesAgent
    deactivateSalesAgent(id: ID!): SalesAgent
    reactivateSalesAgent(id: ID!): SalesAgent

    createInstaller(details: InstallerInput!): NewAccountDetails
    editInstaller(id: ID! details: InstallerInput!): Installer
    deactivateInstaller(id: ID!): Installer
    reactivateInstaller(id: ID!): Installer
  }
`;
