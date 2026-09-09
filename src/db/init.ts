import { count, eq } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import { db, isOfflineDatabase } from "@/db/client";
import { ensureOfflineMigrations } from "@/db/offline-migrations";
import {
  account,
  aiImpactAssessments,
  assessments,
  assessmentLinks,
  auditEvents,
  breachReports,
  departments,
  faqCategories,
  faqEntries,
  faqReferences,
  governanceSettings,
  knowledgeChunks,
  legalMappingOverrides,
  moduleColumnSettings,
  privacyMapOverrides,
  riskRegisterEntries,
  ropaActivities,
  selfAssessments,
  sopDocuments,
  session,
  user,
  users,
  verification,
} from "@/db/schema";
import {
  canonicalFaqReferenceMetadata,
  loadFaqSeedData,
} from "@/lib/faq-knowledge-seed";
import { seedUserPassword, seedUsers } from "@/lib/seed-users";
import { syncKnowledgeChunksFromFaqCenter } from "@/lib/data";

let initialized = false;
let initializationPromise: Promise<void> | null = null;

export async function ensureDatabase() {
  if (initialized) {
    return;
  }

  initializationPromise ??= initializeDatabase();

  try {
    await initializationPromise;
  } catch (error) {
    initializationPromise = null;
    throw error;
  }
}

async function initializeDatabase() {
  await ensureOfflineMigrations();

  const [existing] = await db.select({ value: count() }).from(departments);

  let seededFaqKnowledge = false;

  if ((existing?.value ?? 0) === 0) {
    await seedDatabase({ includeUsers: !isOfflineDatabase });
    seededFaqKnowledge = true;
  } else {
    seededFaqKnowledge = await seedFaqKnowledgeIfEmpty();
  }

  if (seededFaqKnowledge) {
    await syncFaqReferenceMetadata();
  }

  const [existingKnowledge] = await db.select({ value: count() }).from(knowledgeChunks);
  if (seededFaqKnowledge || (existingKnowledge?.value ?? 0) === 0) {
    void syncKnowledgeChunksFromFaqCenter().catch(() => {});
  }

  initialized = true;
}

export async function resetAndSeedDatabase() {
  await db.delete(auditEvents);
  await db.delete(sopDocuments);
  await db.delete(breachReports);
  await db.delete(selfAssessments);
  await db.delete(faqEntries);
  await db.delete(faqReferences);
  await db.delete(faqCategories);
  await db.delete(legalMappingOverrides);
  await db.delete(riskRegisterEntries);
  await db.delete(assessmentLinks);
  await db.delete(aiImpactAssessments);
  await db.delete(assessments);
  await db.delete(ropaActivities);
  await db.delete(moduleColumnSettings);
  await db.delete(privacyMapOverrides);
  await db.delete(governanceSettings);
  await db.delete(users);
  await db.delete(verification);
  await db.delete(account);
  await db.delete(session);
  await db.delete(user);
  await db.delete(departments);
  await seedDatabase({ includeUsers: true });
  initialized = true;
  initializationPromise = Promise.resolve();
}

async function seedDatabase({ includeUsers }: { includeUsers: boolean }) {
  const now = new Date().toISOString();

  await db.insert(departments).values([
    { id: "dept-hr", name: "Human Resources", createdAt: now },
    { id: "dept-marketing", name: "Marketing", createdAt: now },
    { id: "dept-finance", name: "Finance", createdAt: now },
    { id: "dept-product", name: "Product Development", createdAt: now },
    { id: "dept-legal", name: "Legal Team", createdAt: now },
  ]);

  if (includeUsers) {
    await db.insert(users).values(
      seedUsers.map((seedUser) => ({
        id: seedUser.id,
        username: seedUser.username,
        fullName: seedUser.fullName,
        email: seedUser.email,
        role: seedUser.role,
        departmentId: seedUser.departmentId,
        picName: seedUser.fullName,
        picEmail: seedUser.email,
        createdAt: now,
      })),
    );

    const authNow = new Date();
    const passwordHash = await hashPassword(seedUserPassword);

    await db.insert(user).values(
      seedUsers.map((seedUser) => ({
        id: seedUser.id,
        name: seedUser.fullName,
        email: seedUser.email,
        emailVerified: true,
        image: null,
        role: seedUser.role,
        departmentId: seedUser.departmentId,
        createdAt: authNow,
        updatedAt: authNow,
      })),
    );

    await db.insert(account).values(
      seedUsers.map((seedUser) => ({
        id: `account-${seedUser.id}`,
        accountId: seedUser.id,
        providerId: "credential",
        userId: seedUser.id,
        accessToken: null,
        refreshToken: null,
        idToken: null,
        accessTokenExpiresAt: null,
        refreshTokenExpiresAt: null,
        scope: null,
        password: passwordHash,
        createdAt: authNow,
        updatedAt: authNow,
      })),
    );
  }

  await db.insert(governanceSettings).values({
    id: "singleton",
    controllerProcessorContacts:
      "PT Data Protection Governance (Pengendali) - privacy@company.com",
    dpoContact: "dpo@company.com",
    createdAt: now,
    updatedAt: now,
    updatedBy: includeUsers ? "user-dpo" : undefined,
  });

  await seedFaqKnowledgeIfEmpty(includeUsers ? "user-dpo" : undefined);
}

async function seedFaqKnowledgeIfEmpty(seedActorId?: string) {
  const [existing] = await db.select({ value: count() }).from(faqEntries);
  if ((existing?.value ?? 0) > 0) {
    return false;
  }

  const now = new Date().toISOString();
  const data = await loadFaqSeedData();

  if (data.categories.length) {
    await db.insert(faqCategories).values(
      data.categories.map((category) => ({
        id: category.id,
        name: category.name,
        scope: category.scope,
        displayOrder: category.displayOrder,
        createdAt: now,
        updatedAt: now,
      })),
    );
  }

  if (data.entries.length) {
    await db.insert(faqEntries).values(
      data.entries.map((entry) => ({
        id: entry.id,
        categoryId: entry.categoryId,
        question: entry.question,
        answer: entry.answer,
        legalBasis: entry.legalBasis,
        benchmarkSupport: entry.benchmarkSupport,
        status: entry.status,
        displayOrder: entry.displayOrder,
        createdAt: now,
        updatedAt: now,
        createdBy: seedActorId,
        updatedBy: seedActorId,
      })),
    );
  }

  if (data.references.length) {
    await db.insert(faqReferences).values(
      data.references.map((reference) => ({
        id: reference.id,
        groupName: reference.groupName,
        title: reference.title,
        description: reference.description,
        url: reference.url,
        displayOrder: reference.displayOrder,
        createdAt: now,
        updatedAt: now,
      })),
    );
  }

  return true;
}

export async function isDesktopSetupRequired() {
  if (!isOfflineDatabase) {
    return false;
  }

  await ensureDatabase();
  const state = await getDesktopSetupState();
  return state.required;
}

export async function createDesktopMasterAdmin(payload: {
  username: string;
  fullName: string;
  email: string;
  password: string;
}) {
  if (!isOfflineDatabase) {
    return null;
  }

  await ensureDatabase();
  const setupState = await getDesktopSetupState();
  if (!setupState.required) {
    return null;
  }

  const now = new Date().toISOString();
  const authNow = new Date();
  const id = "user-local-masteradmin";
  const email = payload.email.trim().toLowerCase();
  const passwordHash = await hashPassword(payload.password.trim());

  await db.transaction(async (tx) => {
    if (setupState.legacySeedOnly) {
      await removeLegacyDesktopSeedUsers(tx);
    }

    await tx.insert(users).values({
      id,
      username: payload.username.trim(),
      fullName: payload.fullName.trim(),
      email,
      role: "MasterAdmin",
      departmentId: "dept-legal",
      picName: payload.fullName.trim(),
      picEmail: email,
      createdAt: now,
    });

    await tx.insert(user).values({
      id,
      name: payload.fullName.trim(),
      email,
      emailVerified: true,
      image: null,
      role: "MasterAdmin",
      departmentId: "dept-legal",
      createdAt: authNow,
      updatedAt: authNow,
    });

    await tx.insert(account).values({
      id: `account-${id}`,
      accountId: id,
      providerId: "credential",
      userId: id,
      accessToken: null,
      refreshToken: null,
      idToken: null,
      accessTokenExpiresAt: null,
      refreshTokenExpiresAt: null,
      scope: null,
      password: passwordHash,
      createdAt: authNow,
      updatedAt: authNow,
    });

    await tx
      .update(governanceSettings)
      .set({ updatedBy: id, updatedAt: now })
      .where(eq(governanceSettings.id, "singleton"));
  });

  return { username: payload.username.trim(), email };
}

async function getDesktopSetupState() {
  const existingUsers = await db.select({ id: users.id }).from(users);

  if (existingUsers.length === 0) {
    return { required: true, legacySeedOnly: false };
  }

  const seedUserIds = new Set(seedUsers.map((seedUser) => seedUser.id));
  const containsOnlySeedUsers = existingUsers.every((item) => seedUserIds.has(item.id));

  if (!containsOnlySeedUsers) {
    return { required: false, legacySeedOnly: false };
  }

  const hasUserData = await hasDesktopUserData();

  return {
    required: !hasUserData,
    legacySeedOnly: !hasUserData,
  };
}

async function hasDesktopUserData() {
  const dataTables = [
    ropaActivities,
    assessments,
    aiImpactAssessments,
    assessmentLinks,
    riskRegisterEntries,
    auditEvents,
    breachReports,
    selfAssessments,
    sopDocuments,
    moduleColumnSettings,
    legalMappingOverrides,
    privacyMapOverrides,
  ];

  for (const table of dataTables) {
    const [existing] = await db.select({ value: count() }).from(table);
    if ((existing?.value ?? 0) > 0) {
      return true;
    }
  }

  return false;
}

async function removeLegacyDesktopSeedUsers(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
) {
  for (const seedUser of seedUsers) {
    const id = seedUser.id;

    await tx
      .update(ropaActivities)
      .set({ userId: null })
      .where(eq(ropaActivities.userId, id));
    await tx
      .update(governanceSettings)
      .set({ updatedBy: null })
      .where(eq(governanceSettings.updatedBy, id));
    await tx
      .update(moduleColumnSettings)
      .set({ updatedBy: null })
      .where(eq(moduleColumnSettings.updatedBy, id));
    await tx
      .update(faqEntries)
      .set({ createdBy: null })
      .where(eq(faqEntries.createdBy, id));
    await tx
      .update(faqEntries)
      .set({ updatedBy: null })
      .where(eq(faqEntries.updatedBy, id));
    await tx
      .update(breachReports)
      .set({ reportedBy: null })
      .where(eq(breachReports.reportedBy, id));
    await tx
      .update(breachReports)
      .set({ finalizedBy: null })
      .where(eq(breachReports.finalizedBy, id));
    await tx
      .update(selfAssessments)
      .set({ createdBy: null })
      .where(eq(selfAssessments.createdBy, id));
    await tx
      .update(selfAssessments)
      .set({ finalizedBy: null })
      .where(eq(selfAssessments.finalizedBy, id));
    await tx
      .update(aiImpactAssessments)
      .set({ createdBy: null })
      .where(eq(aiImpactAssessments.createdBy, id));
    await tx
      .update(aiImpactAssessments)
      .set({ updatedBy: null })
      .where(eq(aiImpactAssessments.updatedBy, id));
    await tx
      .update(assessmentLinks)
      .set({ createdBy: null })
      .where(eq(assessmentLinks.createdBy, id));
    await tx
      .update(legalMappingOverrides)
      .set({ updatedBy: null })
      .where(eq(legalMappingOverrides.updatedBy, id));
    await tx
      .update(privacyMapOverrides)
      .set({ updatedBy: null })
      .where(eq(privacyMapOverrides.updatedBy, id));
    await tx
      .update(auditEvents)
      .set({ actorId: null })
      .where(eq(auditEvents.actorId, id));
    await tx.delete(session).where(eq(session.userId, id));
    await tx.delete(account).where(eq(account.userId, id));
    await tx.delete(user).where(eq(user.id, id));
    await tx.delete(users).where(eq(users.id, id));
  }
}

async function syncFaqReferenceMetadata() {
  const now = new Date().toISOString();

  await Promise.all(
    Object.entries(canonicalFaqReferenceMetadata).map(([title, metadata]) =>
      db
        .update(faqReferences)
        .set({
          groupName: metadata.groupName,
          description: metadata.description,
          ...(metadata.url ? { url: metadata.url } : {}),
          updatedAt: now,
        })
        .where(eq(faqReferences.title, title)),
    ),
  );
}
