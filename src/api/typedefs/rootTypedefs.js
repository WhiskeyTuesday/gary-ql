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
    id: ID!
    lineOne: String!
    lineTwo: String
    city: String!
    state: String!
    postalCode: String!
  }

  enum ReferralType {
    SERP
    SOCIAL
    FRIEND
    OTHER
  }

  type Customer {
    id: ID!
    name: String!
    addresses: [Address]!
    contactName: String!
    phoneNumber: String!
    emailAddress: String!
    jobs: [Job]!
    leads: [Lead]!
    isTaxExempt: Boolean!
    taxDetails: String
    referralType: ReferralType
    referralDetails: String
  }

  type Material {
    id: ID!
    name: String!
    price: CurrencyAmount!
    unit: String!
  }

  type Lead {
    id: ID!
    status: String!
    createdTime: Int!
    modifiedTime: Int!
    visitTimestamp: Int!
    customer: Customer!
    job: Job!
  }

  type JobStage {
    id: ID!
    status: String!
    job: Job!
    windows: [Window]!
  }

  type Job {
    id: ID!
    status: String!
    address: Address!
    salesAgent: SalesAgent!
    createdTime: Int!
    modifiedTime: Int!
    customer: Customer!
    installers: [Installer]!
    materials: [Material]!
    stages: [JobStage]!
    proposals: [Proposal]!

    notes: String
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
    id: ID!
    location: String!
    windowType: WindowType!
    glassType: GlassType!
    film: Material!
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
    firstName: String!
    lastName: String!

    businessName: String

    phoneNumber: String!
    emailAddress: String!

    isTaxExempt: Boolean!
    taxDetails: String

    referralType: ReferralType
    referralDetails: String

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
