const gql = require('graphql-tag');

module.exports = gql`
  union Agent = Staff | Superuser | SalesAgent
  union Self = Staff | SalesAgent | Installer | Admin | Superuser
  union Profile = StaffProfile
  | SalesAgentProfile
  | InstallerProfile
  | AdminProfile

  type CurrencyAmount {
    currencyCode: String!
    amount: Int!
  }

  type Role {
    name: String!
    id: ID!
  }

  type Superuser {
    id: ID!
    type: String
  }

  type Token {
    iss: String!
    aud: String!
    sub: ID!
  }

  type TaxResult {
    name: String!
    amount: Int!
  }

  type Address {
    lineOne: String!
    lineTwo: String
    city: String!
    state: String!
    postalCode: String!
  }

  type Customer {
    id: ID!
    name: String!
    addresses: [Address]!
    contactName: String!
    contactPhone: String!
  }

  type Material {
    id: ID!
    name: String!
    priceSqFt: CurrencyAmount!
  }

  type Lead {
    id: ID!
    customer: Customer!
    job: Job!
  }

  type JobStage {
    id: ID!
    job: Job!
    status: String!
    windows: [Window]!
  }

  type Job {
    id: ID!
    status: String!
    customer: Customer!
    materials: [Material]!
    stages: [JobStage]!
  }

  enum WindowType {
    CLEAR_SINGLE_PANE
    CLEAR_DUAL_PANE
    TINTED_SP
    TINTED_DP
    LOW_E_DP
    HIGH_PERF_LOW_E_DP
    CLEAR_SP_LAMINATED
    CLEAR_DP_LAMINATED
    TINTED_SP_LAMINATED
    TINTED_DP_LAMINATED
    TRIPLE_PANE_CLEAR
    OTHER
  }

  enum GlassType {
    ANNEALED
    HEAT_STRENGTHENED
    TEMPERED
  }

  type Window {
    location: String!
    type: WindowType!
    glassType: GlassType!
    width: Int!
    height: Int!
  }

  type Proposal {
    id: ID!
    jobId: ID!
    stageIds: [ID!]!
    windows: [Window!]!
    subtotal: CurrencyAmount!
    taxAmount: CurrencyAmount!
    total: CurrencyAmount!
  }

  type Proposal {
    id: ID!
    job: Job!
    status: String!
    totalCost: CurrencyAmount!
  }

  type TaxAmount {
    name: String!
    amount: Int!
  }

  type Invoice {
    id: ID!
    job: Job!
    jobStages: [JobStage]!
    status: String!
    subtotal: CurrencyAmount!
    taxes: [TaxAmount]!
    total: CurrencyAmount!
  }

  type Query {
    time: String!
  }

  input AddressInput {
    lineOne: String!
    lineTwo: String
    city: String!
    state: String!
    postalCode: String!
  }

  input TokenInput {
    iss: String!
    aud: String!
    sub: ID!
  }

  input CurrencyInput {
    currencyCode: String!
    amount: Int!
  }

  input LeadInput {
    addressId: ID!
    customerId: ID!
    isTaxExempt: Boolean!
  }

  input CustomerInput {
    firstName: String
    lastName: String
    contactName: String
    businessName: String

    phoneNumber: String!
    emailAddress: String!
    taxExempt: Boolean!
    addresses: [AddressInput!]!

    memo: String
  }

  input ContactInput {
    name: String!
    phone: String!
    email: String!
    notes: String
  }

  type Mutation {
    time: String!
  }
`;
