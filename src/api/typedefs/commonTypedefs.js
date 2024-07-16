const gql = require('graphql-tag');

module.exports = gql`
  extend type Query {
    self: Self
    roles: [Role]
    materials: [Material]
    material(id: ID!): Material
    customers: [Customer]
    customer(id: ID!): Customer
    leads: [Lead]
    lead(id: ID!): Lead
    jobs: [Job]
    job(id: ID!): Job
    proposals: [Proposal]
    proposal(id: ID!): Proposal
    salesAgents: [SalesAgent]
    salesAgent(id: ID!): SalesAgent
    allStaff: [Staff] # implicit plural is a pain in the ass
    staff(id: ID!): Staff
    installers: [Installer]
    installer(id: ID!): Installer
    windowPrice(window: WindowPriceInput!): Int!
    windowsPrice(windows: [WindowPriceInput]!): Int!
    proposalPreview(jobId: ID! stageIds: [ID]!): Proposal
  }

  input WindowPriceInput {
    materialId: ID!
    widthInches: Int!
    heightInches: Int!
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
    trackLead(details: LeadInput!): String
    createCustomer(details: CustomerInput!): String
    editCustomer(id: ID!, details: CustomerInput!): String
    addAddress(customerId: ID!, address: AddressInput!): String
    deprecateAddress(customerId: ID!, addressId: ID!): String
    createJobDirect(details: JobInput!): String
    convertLead(leadId: ID!, details: JobInput!): String
    modifyJob(id: ID! details: JobInput!): String
  }
`;
