import { db, sqlite } from "@/db/client";
import { departments, user, users } from "@/db/schema";

let initialized = false;

export function ensureDatabase() {
  if (initialized) {
    return;
  }

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS departments (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY NOT NULL,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL,
      department_id TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (department_id) REFERENCES departments(id)
    );

    CREATE TABLE IF NOT EXISTS user (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      email_verified INTEGER NOT NULL,
      image TEXT,
      role TEXT NOT NULL DEFAULT 'PIC',
      department_id TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS session (
      id TEXT PRIMARY KEY NOT NULL,
      expires_at INTEGER NOT NULL,
      token TEXT NOT NULL UNIQUE,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      user_id TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS account (
      id TEXT PRIMARY KEY NOT NULL,
      account_id TEXT NOT NULL,
      provider_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      access_token TEXT,
      refresh_token TEXT,
      id_token TEXT,
      access_token_expires_at INTEGER,
      refresh_token_expires_at INTEGER,
      scope TEXT,
      password TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS verification (
      id TEXT PRIMARY KEY NOT NULL,
      identifier TEXT NOT NULL,
      value TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at INTEGER,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS ropa_activities (
      id TEXT PRIMARY KEY NOT NULL,
      activity_name TEXT NOT NULL,
      process_description TEXT NOT NULL,
      department_id TEXT NOT NULL,
      pic_name TEXT NOT NULL,
      pic_email TEXT NOT NULL,
      legal_basis TEXT NOT NULL,
      processing_purpose TEXT NOT NULL,
      source_mechanism TEXT NOT NULL,
      subject_categories TEXT NOT NULL,
      personal_data_types TEXT NOT NULL,
      recipients TEXT NOT NULL,
      processor_contract_link TEXT NOT NULL,
      data_receiver_role TEXT NOT NULL,
      is_cross_border INTEGER NOT NULL,
      destination_country TEXT NOT NULL,
      export_protection_mechanism TEXT NOT NULL,
      transfer_mechanism TEXT NOT NULL,
      storage_location TEXT NOT NULL,
      retention_period TEXT NOT NULL,
      technical_measures TEXT NOT NULL,
      organizational_measures TEXT NOT NULL,
      data_subject_rights TEXT NOT NULL,
      risk_assessment_level TEXT NOT NULL,
      high_risk_categories TEXT NOT NULL DEFAULT '[]',
      risk_register_reference TEXT NOT NULL DEFAULT '',
      risk_likelihood TEXT NOT NULL DEFAULT 'Medium',
      risk_impact TEXT NOT NULL DEFAULT 'Medium',
      risk_context TEXT NOT NULL DEFAULT '',
      existing_controls TEXT NOT NULL DEFAULT '',
      residual_risk_level TEXT NOT NULL DEFAULT 'Medium',
      risk_mitigation_plan TEXT NOT NULL DEFAULT '',
      volume_level TEXT NOT NULL,
      uses_automated_decision_making INTEGER NOT NULL,
      previous_process TEXT NOT NULL,
      next_process TEXT NOT NULL,
      status TEXT NOT NULL,
      user_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (department_id) REFERENCES departments(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS assessments (
      id TEXT PRIMARY KEY NOT NULL,
      ropa_id TEXT NOT NULL,
      task_type TEXT NOT NULL,
      status TEXT NOT NULL,
      severity TEXT NOT NULL,
      title TEXT NOT NULL,
      reason TEXT NOT NULL,
      notes TEXT NOT NULL,
      due_date TEXT NOT NULL,
      pic_name TEXT NOT NULL,
      department_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (ropa_id) REFERENCES ropa_activities(id),
      FOREIGN KEY (department_id) REFERENCES departments(id)
    );

    CREATE TABLE IF NOT EXISTS audit_events (
      id TEXT PRIMARY KEY NOT NULL,
      actor_id TEXT,
      event_type TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (actor_id) REFERENCES users(id)
    );
  `);

  ensureRopaRiskColumns();

  const existing = sqlite
    .prepare("SELECT COUNT(*) as count FROM departments")
    .get() as { count: number };

  if (existing.count === 0) {
    seedDatabase();
  }

  initialized = true;
}

function ensureRopaRiskColumns() {
  const columns = sqlite
    .prepare("PRAGMA table_info(ropa_activities)")
    .all() as Array<{ name: string }>;
  const columnNames = new Set(columns.map((column) => column.name));
  const additions = [
    ["high_risk_categories", "TEXT NOT NULL DEFAULT '[]'"],
    ["risk_register_reference", "TEXT NOT NULL DEFAULT ''"],
    ["risk_likelihood", "TEXT NOT NULL DEFAULT 'Medium'"],
    ["risk_impact", "TEXT NOT NULL DEFAULT 'Medium'"],
    ["risk_context", "TEXT NOT NULL DEFAULT ''"],
    ["existing_controls", "TEXT NOT NULL DEFAULT ''"],
    ["residual_risk_level", "TEXT NOT NULL DEFAULT 'Medium'"],
    ["risk_mitigation_plan", "TEXT NOT NULL DEFAULT ''"],
  ] as const;

  for (const [name, definition] of additions) {
    if (!columnNames.has(name)) {
      sqlite.exec(`ALTER TABLE ropa_activities ADD COLUMN ${name} ${definition};`);
    }
  }
}

export function resetAndSeedDatabase() {
  ensureDatabase();
  sqlite.exec(`
    DELETE FROM audit_events;
    DELETE FROM assessments;
    DELETE FROM ropa_activities;
    DELETE FROM users;
    DELETE FROM verification;
    DELETE FROM account;
    DELETE FROM session;
    DELETE FROM user;
    DELETE FROM departments;
  `);
  seedDatabase();
  initialized = true;
}

function seedDatabase() {
  const now = new Date().toISOString();

  db.insert(departments)
    .values([
      { id: "dept-hr", name: "Human Resources", createdAt: now },
      { id: "dept-marketing", name: "Marketing", createdAt: now },
      { id: "dept-finance", name: "Finance", createdAt: now },
      { id: "dept-product", name: "Product Development", createdAt: now },
      { id: "dept-legal", name: "Legal Team", createdAt: now },
    ])
    .run();

  db.insert(users)
    .values([
      {
        id: "user-admin",
        fullName: "Nadia Pratama",
        email: "admin@privacyvault.local",
        role: "Admin",
        departmentId: "dept-legal",
        createdAt: now,
      },
      {
        id: "user-pic-hr",
        fullName: "Sarah Connor",
        email: "sarah@privacyvault.local",
        role: "PIC",
        departmentId: "dept-hr",
        createdAt: now,
      },
      {
        id: "user-pic-marketing",
        fullName: "Bima Santoso",
        email: "bima@privacyvault.local",
        role: "PIC",
        departmentId: "dept-marketing",
        createdAt: now,
      },
    ])
    .run();

  const authNow = new Date();
  db.insert(user)
    .values([
      {
        id: "auth-admin",
        name: "Nadia Pratama",
        email: "admin@privacyvault.local",
        emailVerified: true,
        image: null,
        role: "Admin",
        departmentId: "dept-legal",
        createdAt: authNow,
        updatedAt: authNow,
      },
      {
        id: "auth-pic-hr",
        name: "Sarah Connor",
        email: "sarah@privacyvault.local",
        emailVerified: true,
        image: null,
        role: "PIC",
        departmentId: "dept-hr",
        createdAt: authNow,
        updatedAt: authNow,
      },
    ])
    .run();

}
