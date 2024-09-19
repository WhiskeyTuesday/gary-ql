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
    admin(id: ID!): Admin
    admins: [Admin]
    salesAgents: [SalesAgent]
    salesAgent(id: ID!): SalesAgent
    allStaff: [Staff] # implicit plural is a pain in the ass
    staff(id: ID!): Staff
    installers: [Installer]
    installer(id: ID!): Installer
    windowPrice(window: WindowPriceInput!): Int!
    windowsPrice(windows: [WindowPriceInput]!): [Int]!
    proposalPreview(jobId: ID!): ProposalPreview!
  }

  input WindowPriceInput {
    materialId: ID!
    widthInches: Int!
    heightInches: Int!
  }


  input WindowInput {
    id: ID!
    location: String!
    type: WindowType!
    glassType: GlassType!
    filmId: ID!
    width: Int!
    height: Int!
  }

  input StageInput {
    id: ID!
    windows: [WindowInput!]!

    notes: String
  }

  input InstallerChangeInput {
    added: [ID]
    removed: [ID]
  }

  input JobDetailsInput {
    stages: [StageInput]
    materials: [ID]
    installers: InstallerChangeInput
    startTimestamp: Int
    notes: String
    memo: String
  }

  input JobCreatedInput {
    isTaxExempt: Boolean!
    customerId: ID!
    addressId: ID!

    salesAgentId: ID

    notes: String
  }

  input LeadConvertedInput {
    isTaxExempt: Boolean!
    customerId: ID!
    addressId: ID!
    salesAgentId: ID!

    notes: String
  }

  extend type Mutation {
    trackLead(details: LeadInput!): Lead
    editLead(id: ID! salesAgentId: ID visitTimestamp: Int notes: String): Lead
    markLeadRejected(id: ID!): Lead
    createCustomer(details: CustomerInput!): String
    editCustomer(id: ID!, details: CustomerInput!): String
    addAddress(customerId: ID!, address: AddressInput!): String
    editAddress(
      customerId: ID!
      addressId: ID!
      address: AddressInput!
      activate: Boolean
      deactivate: Boolean
    ): Customer
    deprecateAddress(customerId: ID! addressId: ID!): String
    reinstateAddress(customerId: ID! addressId: ID!): String
    createJobDirect(details: JobCreatedInput!): Job
    convertLead(leadId: ID! details: LeadConvertedInput!): Job
    modifyJob(id: ID! details: JobDetailsInput!): Job
    sendProposal(jobId: ID! sim: Boolean): Proposal
    cancelProposal(jobId: ID! proposalId: ID!): Boolean
    supercedeProposal(jobId: ID! stageIds: [ID!]!): Proposal
    markWindowsComplete(jobId: ID! windowIds: [ID!]!): String
  }
`;
