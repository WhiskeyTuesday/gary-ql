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
    isActive: Boolean!
  }

  enum ReferralType {
    SERP
    SOCIAL
    FRIEND
    OTHER
  }

  type Customer {
    id: ID!
    addresses: [Address]!

    firstName: String!
    lastName: String!
    businessName: String

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
    status: String!
    name: String!
    price: CurrencyAmount!
    unit: String!
  }

  type Lead {
    id: ID!
    addressId: ID!
    status: String!
    createdTime: Int!
    modifiedTime: Int!
    visitTimestamp: Int!
    customer: Customer!
    job: Job!

    salesAgent: SalesAgent
    notes: String
  }

  type JobStage {
    id: ID!
    status: String!
    job: Job!
    windows: [Window]!
  }

  type Invoice {
    id: ID!
    externalId: ID!
    status: String!
    sentTimestamp: Int!

    sent: Boolean!
    paid: Boolean!
    cancelled: Boolean!
    refunded: Boolean!
    voided: Boolean!

    paidTimestamp: Int
    cancelledTimestamp: Int
    refundedTimestamp: Int
    voidedTimestamp: Int

    sentMemo: String
    paidMemo: String
    cancelledMemo: String
    refundedMemo: String
    voidedMemo: String

    paidExternalId: ID
    cancelledExternalId: ID
    refundedExternalId: ID
    voidedExternalId: ID
  }

  type Job {
    id: ID!
    status: String!
    proposalStatus: String!
    address: Address!
    salesAgent: SalesAgent!
    customer: Customer!
    installers: [Installer]!
    materials: [Material]!
    stages: [JobStage]!
    proposals: [Proposal]!
    invoices: [Invoice]!

    startTimestamp: Int
    completedTime: Int
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
    status: String!
    location: String!
    type: WindowType!
    glassType: GlassType!
    film: Material!
    width: Int!
    height: Int!
  }

  type FilmProposal {
    sqft: Int!
    lnft: Int!
    priceTotal: Int!
    film: Material!
  }

  type WindowProposal {
    id: ID!
    sqft: Int!
    lnft: Int!
    filmName: String!
    film: Material!
    price: Int!
  }

  type StageProposal {
    id: ID!
    status: String!
    accepted: Boolean!
    rejected: Boolean!
    windows: [WindowProposal]!
    films: [FilmProposal]!
    subtotal: Int!
  }

  type ProposalPreview {
    films: [FilmProposal]!
    stages: [StageProposal]!
    isTaxExempt: Boolean!
    taxAmount: Int!
    subtotal: Int!
    total: Int!
  }

  type Proposal {
    id: ID!
    status: String!
    job: Job!
    salesAgent: SalesAgent!
    films: [FilmProposal]!
    stages: [StageProposal]!
    isTaxExempt: Boolean!
    taxAmount: Int!
    subtotal: Int!
    total: Int!

    sent: Boolean!
    accepted: Boolean!
    rejected: Boolean!
    cancelled: Boolean!

    issuedTimestamp: Int!
    acceptedTimestamp: Int
    rejectedTimestamp: Int
    cancelledTimestamp: Int

    cancelledMemo: String
    rejectedMemo: String
  }

  type Query {
    time: String!
    proposal(id: ID!): Proposal
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

    salesAgentId: ID
    notes: String
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
    requestPasswordResetEmail(email: String!): Boolean!
    acceptProposal(id: ID!): Boolean!
    rejectProposal(id: ID!): Boolean!
  }
`;
