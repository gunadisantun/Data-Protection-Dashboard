export const configurableModuleValues = ["ropa", "dpia", "tia", "lia"] as const;

export type ConfigurableModule = (typeof configurableModuleValues)[number];

export type ModuleColumnDefinition = {
  key: string;
  label: string;
  description: string;
  locked?: boolean;
  defaultVisible?: boolean;
  custom?: boolean;
  inputType?: ModuleCustomColumnInputType;
  options?: string[];
};

export type ModuleColumnSettings = {
  module: ConfigurableModule;
  visibleColumns: string[];
  customColumns: ModuleCustomColumn[];
};

export type ModuleCustomColumn = {
  key: string;
  label: string;
  description: string;
  inputType: ModuleCustomColumnInputType;
  options: string[];
};

export const moduleCustomColumnInputTypeValues = [
  "short_answer",
  "long_answer",
  "checkbox",
  "dropdown",
] as const;

export type ModuleCustomColumnInputType =
  (typeof moduleCustomColumnInputTypeValues)[number];

export const moduleCustomColumnInputTypeLabels: Record<
  ModuleCustomColumnInputType,
  string
> = {
  short_answer: "Short Answer",
  long_answer: "Long Answer",
  checkbox: "Checkbox",
  dropdown: "Dropdown",
};

export const moduleColumnLabels: Record<ConfigurableModule, string> = {
  ropa: "RoPA Registry",
  dpia: "DPIA Dashboard",
  tia: "TIA Dashboard",
  lia: "LIA Dashboard",
};

export const moduleColumnDefinitions: Record<
  ConfigurableModule,
  ModuleColumnDefinition[]
> = {
  ropa: [
    {
      key: "activityName",
      label: "Activity Name",
      description: "Processing activity name.",
      locked: true,
      defaultVisible: true,
    },
    {
      key: "departmentName",
      label: "Department",
      description: "Owning department or business unit.",
      defaultVisible: true,
    },
    {
      key: "legalBasis",
      label: "Legal Basis",
      description: "Selected processing legal basis.",
    },
    {
      key: "subjectCategory",
      label: "Subject Category",
      description: "Kategori subjek data utama.",
      defaultVisible: true,
    },
    {
      key: "personalDataTypes",
      label: "Personal Data Types",
      description: "Summary of processed personal data types.",
    },
    {
      key: "recipients",
      label: "Recipients",
      description: "Parties that may receive or access the data.",
    },
    {
      key: "dataReceiverRole",
      label: "Recipient Role",
      description: "Primary role of the data recipient.",
    },
    {
      key: "riskLevel",
      label: "Risk Level",
      description: "Level risiko aktivitas.",
      defaultVisible: true,
    },
    {
      key: "status",
      label: "Status",
      description: "Status aktivitas RoPA.",
      defaultVisible: true,
    },
    {
      key: "obligations",
      label: "DPIA/TIA/LIA",
      description: "Assessment yang tertrigger dari aktivitas.",
      defaultVisible: true,
    },
    {
      key: "picName",
      label: "PIC",
      description: "PIC yang ditarik dari profil akun.",
    },
    {
      key: "crossBorder",
      label: "Cross-Border",
      description: "Indikasi transfer lintas negara.",
    },
    {
      key: "createdAt",
      label: "Date Created",
      description: "Tanggal aktivitas dibuat.",
      defaultVisible: true,
    },
    {
      key: "actions",
      label: "Actions",
      description: "View, analyze, and delete actions.",
      locked: true,
      defaultVisible: true,
    },
  ],
  dpia: assessmentColumns(),
  tia: assessmentColumns(),
  lia: assessmentColumns(),
};

function assessmentColumns(): ModuleColumnDefinition[] {
  return [
    {
      key: "activityName",
      label: "Activity",
      description: "Related RoPA activity.",
      locked: true,
      defaultVisible: true,
    },
    {
      key: "departmentName",
      label: "Department",
      description: "Related business unit.",
      defaultVisible: true,
    },
    {
      key: "status",
      label: "Status",
      description: "Assessment progress status.",
      defaultVisible: true,
    },
    {
      key: "severity",
      label: "Severity",
      description: "Obligation or urgency level.",
      defaultVisible: true,
    },
    {
      key: "dueDate",
      label: "Due Date",
      description: "Assessment target completion date.",
      defaultVisible: true,
    },
    {
      key: "picName",
      label: "PIC",
      description: "PIC assessment.",
    },
    {
      key: "reason",
      label: "Reason",
      description: "Reason the assessment was triggered.",
    },
    {
      key: "title",
      label: "Task Title",
      description: "Judul task assessment.",
    },
    {
      key: "createdAt",
      label: "Created",
      description: "Assessment creation date.",
    },
    {
      key: "updatedAt",
      label: "Updated",
      description: "Last assessment update date.",
    },
    {
      key: "action",
      label: "Action",
      description: "Open assessment action.",
      locked: true,
      defaultVisible: true,
    },
  ];
}

export function getDefaultVisibleColumns(module: ConfigurableModule) {
  return moduleColumnDefinitions[module]
    .filter((column) => column.locked || column.defaultVisible)
    .map((column) => column.key);
}

export function getModuleColumnDefinitions(
  module: ConfigurableModule,
  customColumns?: ModuleCustomColumn[] | null,
): ModuleColumnDefinition[] {
  return [
    ...moduleColumnDefinitions[module],
    ...normalizeCustomColumns(customColumns).map<ModuleColumnDefinition>((column) => ({
      ...column,
      custom: true,
      locked: false,
      defaultVisible: true,
    })),
  ];
}

export function normalizeVisibleColumns(
  module: ConfigurableModule,
  visibleColumns?: string[] | null,
  customColumns?: ModuleCustomColumn[] | null,
) {
  const definitions = getModuleColumnDefinitions(module, customColumns);
  const availableKeys = new Set(definitions.map((column) => column.key));
  const lockedKeys = definitions
    .filter((column) => column.locked)
    .map((column) => column.key);
  const source = Array.isArray(visibleColumns)
    ? visibleColumns
    : getDefaultVisibleColumns(module);
  const normalized = source.filter((key) => availableKeys.has(key));

  for (const key of lockedKeys) {
    if (!normalized.includes(key)) {
      normalized.push(key);
    }
  }

  if (!normalized.length) {
    return getDefaultVisibleColumns(module);
  }

  return definitions
    .map((column) => column.key)
    .filter((key) => normalized.includes(key));
}

export function normalizeModuleColumnSettings(
  module: ConfigurableModule,
  visibleColumns?: string[] | null,
  customColumns?: ModuleCustomColumn[] | null,
): ModuleColumnSettings {
  const normalizedCustomColumns = normalizeCustomColumns(customColumns);
  return {
    module,
    visibleColumns: normalizeVisibleColumns(
      module,
      visibleColumns,
      normalizedCustomColumns,
    ),
    customColumns: normalizedCustomColumns,
  };
}

export function isConfigurableModule(value: string): value is ConfigurableModule {
  return configurableModuleValues.includes(value as ConfigurableModule);
}

export function createCustomColumn(
  module: ConfigurableModule,
  label: string,
  existingColumns: ModuleColumnDefinition[],
  inputType: ModuleCustomColumnInputType = "short_answer",
  options: string[] = [],
) {
  const normalizedLabel = label.trim().replace(/\s+/g, " ");
  const baseKey =
    `custom_${slugify(normalizedLabel)}` || `custom_${Date.now().toString(36)}`;
  const usedKeys = new Set(existingColumns.map((column) => column.key));
  let key = baseKey;
  let attempt = 2;

  while (usedKeys.has(key)) {
    key = `${baseKey}_${attempt}`;
    attempt += 1;
  }

  return {
    key,
    label: normalizedLabel || `Custom Column ${module.toUpperCase()}`,
    description: "Custom column configured by MasterAdmin.",
    inputType,
    options: hasSelectableOptions(inputType) ? normalizeOptions(options) : [],
  };
}

function normalizeCustomColumns(
  customColumns?: ModuleCustomColumn[] | null,
): ModuleCustomColumn[] {
  if (!Array.isArray(customColumns)) {
    return [];
  }

  const seen = new Set<string>();
  return customColumns
    .map((column) => ({
      key: String(column.key ?? "").trim(),
      label: String(column.label ?? "").trim().replace(/\s+/g, " "),
      description: String(column.description ?? "").trim(),
      inputType: normalizeInputType(column.inputType),
      options: hasSelectableOptions(normalizeInputType(column.inputType))
        ? normalizeOptions(column.options)
        : [],
    }))
    .filter((column) => column.key && column.label)
    .filter((column) => {
      if (seen.has(column.key)) {
        return false;
      }
      seen.add(column.key);
      return true;
    });
}

function hasSelectableOptions(inputType: ModuleCustomColumnInputType) {
  return inputType === "dropdown" || inputType === "checkbox";
}

function normalizeInputType(value: unknown): ModuleCustomColumnInputType {
  return moduleCustomColumnInputTypeValues.includes(
    value as ModuleCustomColumnInputType,
  )
    ? (value as ModuleCustomColumnInputType)
    : "short_answer";
}

function normalizeOptions(options: unknown) {
  if (!Array.isArray(options)) {
    return [];
  }

  return options
    .map((option) => String(option).trim())
    .filter(Boolean)
    .filter((option, index, all) => all.indexOf(option) === index);
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
