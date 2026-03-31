import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export interface SelectOption {
  value: string;
  label: string;
}

export interface ProgramOption extends SelectOption {
  id: string;
  educationLevel: string;
}

export interface AcademicCatalog {
  educationLevels: SelectOption[];
  programs: ProgramOption[];
  programsByEducationLevel: Record<string, ProgramOption[]>;
  levelsByProgramId: Record<string, string[]>;
}

const EDUCATION_LEVEL_LABELS: Record<string, string> = {
  college: "College",
  shs: "Senior High School",
};

const EDUCATION_LEVEL_SORT_ORDER: Record<string, number> = {
  college: 1,
  shs: 2,
};

export const normalizeEducationLevel = (value: string | null | undefined) => {
  const normalized = value?.trim().toLowerCase();

  if (!normalized) {
    return "";
  }

  if (normalized === "senior high school") {
    return "shs";
  }

  return normalized;
};

export const getEducationLevelLabel = (value: string | null | undefined) => {
  const normalized = normalizeEducationLevel(value);

  if (!normalized) {
    return "";
  }

  return EDUCATION_LEVEL_LABELS[normalized] || value?.trim() || "";
};

export const getLegacyDepartmentLabel = (value: string | null | undefined) =>
  getEducationLevelLabel(value) || (value?.trim() ?? "");

const sortEducationLevels = (left: string, right: string) => {
  const leftOrder = EDUCATION_LEVEL_SORT_ORDER[left] ?? Number.MAX_SAFE_INTEGER;
  const rightOrder = EDUCATION_LEVEL_SORT_ORDER[right] ?? Number.MAX_SAFE_INTEGER;

  if (leftOrder !== rightOrder) {
    return leftOrder - rightOrder;
  }

  return left.localeCompare(right);
};

type SystemProgram = Tables<"system_programs">;
type SystemProgramLevel = Tables<"system_program_levels">;

export const fetchAcademicCatalog = async (): Promise<AcademicCatalog> => {
  const [{ data: programRows, error: programError }, { data: levelRows, error: levelError }] =
    await Promise.all([
      supabase
        .from("system_programs")
        .select("id, education_level, program_name")
        .order("education_level", { ascending: true })
        .order("program_name", { ascending: true }),
      supabase
        .from("system_program_levels")
        .select("program_id, level_name, is_enabled, sort_order")
        .eq("is_enabled", true)
        .order("program_id", { ascending: true })
        .order("sort_order", { ascending: true }),
    ]);

  if (programError) {
    throw programError;
  }

  if (levelError) {
    throw levelError;
  }

  const levelsByProgramId = (levelRows ?? []).reduce<Record<string, string[]>>((acc, row) => {
    const typedRow = row as Pick<SystemProgramLevel, "program_id" | "level_name">;

    if (!acc[typedRow.program_id]) {
      acc[typedRow.program_id] = [];
    }

    acc[typedRow.program_id].push(typedRow.level_name);
    return acc;
  }, {});

  const programs = (programRows ?? []).map((row) => {
    const typedRow = row as Pick<SystemProgram, "id" | "education_level" | "program_name">;
    const educationLevel = normalizeEducationLevel(typedRow.education_level);

    return {
      id: typedRow.id,
      educationLevel,
      value: typedRow.program_name,
      label: typedRow.program_name,
    };
  });

  const educationLevels = Array.from(new Set(programs.map((program) => program.educationLevel)))
    .filter(Boolean)
    .sort(sortEducationLevels)
    .map((educationLevel) => ({
      value: educationLevel,
      label: getEducationLevelLabel(educationLevel),
    }));

  const programsByEducationLevel = programs.reduce<Record<string, ProgramOption[]>>((acc, program) => {
    if (!acc[program.educationLevel]) {
      acc[program.educationLevel] = [];
    }

    acc[program.educationLevel].push(program);
    return acc;
  }, {});

  return {
    educationLevels,
    programs,
    programsByEducationLevel,
    levelsByProgramId,
  };
};
