export const DSR_REQUEST_TYPES = [
  "Access",
  "Correction",
  "Deletion",
  "Withdrawal of Consent",
  "Objection",
  "Restriction",
  "Data Portability",
  "Complaint",
] as const;

export type DsrRequestType = (typeof DSR_REQUEST_TYPES)[number];

export const DSR_STATUSES = [
  "New",
  "Identity Verification",
  "In Review",
  "In Progress",
  "Waiting for Unit",
  "Waiting for Subject",
  "Response Ready",
  "DPO Review",
  "Responded",
  "Closed",
  "Rejected",
] as const;

export type DsrStatus = (typeof DSR_STATUSES)[number];
