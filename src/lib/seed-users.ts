export type SeedUserRole = "MasterAdmin" | "DPO" | "User";

export type SeedUser = {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: SeedUserRole;
  departmentId: string;
};

export const seedUserPassword = "password123";

export const seedUsers: SeedUser[] = [
  {
    id: "user-admin",
    username: "masteradmin",
    email: "masteradmin@privacyvault.local",
    fullName: "Master Admin",
    role: "MasterAdmin",
    departmentId: "dept-legal",
  },
  {
    id: "user-dpo",
    username: "dpo",
    email: "dpo@privacyvault.local",
    fullName: "Data Protection Officer",
    role: "DPO",
    departmentId: "dept-legal",
  },
  {
    id: "user-finance",
    username: "user_finance",
    email: "user_finance@privacyvault.local",
    fullName: "User Finance",
    role: "User",
    departmentId: "dept-finance",
  },
  {
    id: "user-hr",
    username: "user_hr",
    email: "user_hr@privacyvault.local",
    fullName: "User HR",
    role: "User",
    departmentId: "dept-hr",
  },
  {
    id: "user-legal",
    username: "user_legal",
    email: "user_legal@privacyvault.local",
    fullName: "User Legal",
    role: "User",
    departmentId: "dept-legal",
  },
  {
    id: "user-marketing",
    username: "user_marketing",
    email: "user_marketing@privacyvault.local",
    fullName: "User Marketing",
    role: "User",
    departmentId: "dept-marketing",
  },
  {
    id: "user-product",
    username: "user_product",
    email: "user_product@privacyvault.local",
    fullName: "User Product",
    role: "User",
    departmentId: "dept-product",
  },
];

const usernameEmailEntries = seedUsers.map((seedUser) => [
  seedUser.username.toLowerCase(),
  seedUser.email,
]);

export const usernameEmailMap = Object.fromEntries(usernameEmailEntries);

export function resolveLoginEmail(usernameOrEmail: string) {
  const normalized = usernameOrEmail.trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  if (normalized.includes("@")) {
    return normalized;
  }

  return usernameEmailMap[normalized] ?? null;
}
