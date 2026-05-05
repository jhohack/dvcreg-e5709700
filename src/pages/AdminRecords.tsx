import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { GraduationCap, Search, X, Eye } from "lucide-react";
import { Link } from "react-router-dom";
import {
  fetchAcademicCatalog,
  getEducationLevelLabel,
  normalizeEducationLevel,
} from "@/lib/academicCatalog";
import { normalizeFacebookLink } from "@/lib/facebook";

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  middle_name: string | null;
  email: string | null;
  education_level: string | null;
  department: string | null;
  program: string | null;
  course: string | null;
  shs_track: string | null;
  level: string | null;
  year_level: string | null;
  date_created: string;
  [key: string]: string | number | boolean | null | undefined;
}

const fieldLabels: Record<string, string> = {
  first_name: "First Name", last_name: "Last Name", middle_name: "Middle Name",
  date_of_birth: "Date of Birth", age: "Age", place_of_birth: "Place of Birth",
  gender: "Gender", civil_status: "Civil Status", spouse_name: "Spouse Name",
  nationality: "Nationality", religion: "Religion", tribe: "Tribe",
  vaccination_status: "Vaccination Status", address: "Permanent Address",
  current_address: "Current Address", contact: "Contact", email: "Email Address", facebook_link: "Facebook Profile",
  parent_guardian: "Primary Guardian", parent_guardian_relation: "Relation",
  parent_guardian_address: "Guardian Address", parent_guardian_contact: "Guardian Contact",
  sec_parent_guardian: "Secondary Guardian", sec_parent_guardian_relation: "Relation",
  sec_parent_guardian_address: "Sec. Guardian Address", sec_parent_guardian_contact: "Sec. Guardian Contact",
  father_first_name: "Father First Name", father_middle_name: "Father Middle Name",
  father_last_name: "Father Last Name", father_name: "Father Full Name",
  father_occupation: "Father Occupation", father_contact: "Father Contact",
  mother_first_name: "Mother First Name", mother_middle_name: "Mother Middle Name",
  mother_last_name: "Mother Last Name", mother_name: "Mother Full Name",
  mother_occupation: "Mother Occupation", mother_contact: "Mother Contact",
  parent_marital_status: "Parents' Marital Status", income_sources: "Income Sources",
  other_income: "Other Income", monthly_income: "Monthly Income",
  student_lrn: "LRN", education_level: "Education Level", department: "Department", shs_track: "Strand",
  elem_school: "Elementary School", elem_address: "Elem. Address", elem_year: "Elem. Year",
  sec_school: "Secondary School", sec_address: "Sec. Address", sec_year: "Sec. Year",
  last_school: "Last School", last_school_address: "Last School Address",
  last_school_year: "Last School Year", program: "Program", course: "Course", level: "Level", year_level: "Year Level",
  date_created: "Date Registered",
};

const AdminRecords = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [educationLevelFilter, setEducationLevelFilter] = useState("");
  const [programFilter, setProgramFilter] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [selected, setSelected] = useState<Student | null>(null);
  const academicCatalogQuery = useQuery({
    queryKey: ["academic-catalog"],
    queryFn: fetchAcademicCatalog,
    staleTime: 1000 * 60 * 10,
  });

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("admission")
      .select("*")
      .order("date_created", { ascending: false });

    if (!error && data) {
      setStudents(data as Student[]);
    }

    setLoading(false);
  };

  const getStudentEducationLevel = (student: Student) =>
    normalizeEducationLevel(student.education_level || student.department);

  const getStudentProgram = (student: Student) =>
    student.program || student.course || student.shs_track || "";

  const getStudentLevel = (student: Student) =>
    student.level || student.year_level || "";

  const filtered = students.filter((student) => {
    const name = `${student.first_name} ${student.middle_name || ""} ${student.last_name}`.toLowerCase();
    const studentEducationLevel = getStudentEducationLevel(student);
    const studentProgram = getStudentProgram(student);
    const studentLevel = getStudentLevel(student);

    if (search && !name.includes(search.toLowerCase())) return false;
    if (educationLevelFilter && studentEducationLevel !== educationLevelFilter) return false;
    if (programFilter && studentProgram !== programFilter) return false;
    if (levelFilter && studentLevel !== levelFilter) return false;
    return true;
  });

  const educationLevelOptions = academicCatalogQuery.data?.educationLevels ?? [];
  const programOptions = useMemo(() => {
    if (!academicCatalogQuery.data) {
      return [];
    }

    if (educationLevelFilter) {
      return academicCatalogQuery.data.programsByEducationLevel[educationLevelFilter] ?? [];
    }

    return academicCatalogQuery.data.programs;
  }, [academicCatalogQuery.data, educationLevelFilter]);

  const levelOptions = useMemo(() => {
    if (!academicCatalogQuery.data) {
      return [];
    }

    if (programFilter) {
      const selectedProgram = academicCatalogQuery.data.programs.find((program) =>
        program.value === programFilter &&
        (!educationLevelFilter || program.educationLevel === educationLevelFilter)
      );

      return selectedProgram
        ? academicCatalogQuery.data.levelsByProgramId[selectedProgram.id] ?? []
        : [];
    }

    const eligiblePrograms = educationLevelFilter
      ? academicCatalogQuery.data.programsByEducationLevel[educationLevelFilter] ?? []
      : academicCatalogQuery.data.programs;

    return Array.from(new Set(eligiblePrograms.flatMap((program) =>
      academicCatalogQuery.data?.levelsByProgramId[program.id] ?? []
    )));
  }, [academicCatalogQuery.data, educationLevelFilter, programFilter]);

  const clearFilters = () => {
    setSearch("");
    setEducationLevelFilter("");
    setProgramFilter("");
    setLevelFilter("");
  };

  const hasFilters = search || educationLevelFilter || programFilter || levelFilter;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-foreground leading-tight">Student Records</h1>
              <p className="text-xs text-muted-foreground">{filtered.length} student{filtered.length !== 1 && "s"}</p>
            </div>
          </div>
          <Link to="/">
            <Button variant="outline" size="sm">Registration Form</Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="section-card mb-5">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-10 bg-background"
              />
            </div>
            <Select
              value={educationLevelFilter}
              onValueChange={(value) => {
                setEducationLevelFilter(value);
                setProgramFilter("");
                setLevelFilter("");
              }}
            >
              <SelectTrigger className="w-[180px] h-10 bg-background"><SelectValue placeholder="Education Level" /></SelectTrigger>
              <SelectContent>
                {educationLevelOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={programFilter}
              onValueChange={(value) => {
                setProgramFilter(value);
                setLevelFilter("");
              }}
            >
              <SelectTrigger className="w-[220px] h-10 bg-background"><SelectValue placeholder="Program" /></SelectTrigger>
              <SelectContent>
                {programOptions.map((option) => (
                  <SelectItem key={option.id} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger className="w-[140px] h-10 bg-background"><SelectValue placeholder="Level" /></SelectTrigger>
              <SelectContent>
                {levelOptions.map((level) => <SelectItem key={level} value={level}>{level}</SelectItem>)}
              </SelectContent>
            </Select>
            {hasFilters && (
              <Button variant="ghost" size="icon" onClick={clearFilters} className="h-10 w-10 shrink-0">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="section-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-3 font-semibold text-muted-foreground">Name</th>
                <th className="text-left py-3 px-3 font-semibold text-muted-foreground hidden md:table-cell">Education Level</th>
                <th className="text-left py-3 px-3 font-semibold text-muted-foreground hidden md:table-cell">Program</th>
                <th className="text-left py-3 px-3 font-semibold text-muted-foreground hidden sm:table-cell">Level</th>
                <th className="text-left py-3 px-3 font-semibold text-muted-foreground hidden lg:table-cell">Date</th>
                <th className="py-3 px-3"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-10 text-muted-foreground">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-muted-foreground">No students found.</td></tr>
              ) : (
                filtered.map((student) => (
                  <tr key={student.id} className="border-b border-border/50 hover:bg-muted/40 transition-colors">
                    <td className="py-3 px-3 font-medium text-foreground">
                      {student.last_name}, {student.first_name} {student.middle_name || ""}
                    </td>
                    <td className="py-3 px-3 text-muted-foreground hidden md:table-cell">{getEducationLevelLabel(student.education_level || student.department) || "-"}</td>
                    <td className="py-3 px-3 text-muted-foreground hidden md:table-cell">{getStudentProgram(student) || "-"}</td>
                    <td className="py-3 px-3 text-muted-foreground hidden sm:table-cell">{getStudentLevel(student) || "-"}</td>
                    <td className="py-3 px-3 text-muted-foreground hidden lg:table-cell">
                      {new Date(student.date_created).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-3">
                      <Button variant="ghost" size="icon" onClick={() => setSelected(student)} className="h-8 w-8">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {selected && `${selected.first_name} ${selected.middle_name || ""} ${selected.last_name}`}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 mt-2">
              {Object.entries(fieldLabels).map(([key, label]) => {
                if (key === "department" && selected.education_level) return null;
                if (key === "course" && selected.program) return null;
                if (key === "shs_track" && selected.program) return null;
                if (key === "year_level" && selected.level) return null;

                const val = selected[key];
                const stringValue = typeof val === "string" ? val.trim() : String(val);
                if (!stringValue && val !== 0) return null;

                const facebookUrl = key === "facebook_link"
                  ? normalizeFacebookLink(stringValue)
                  : "";
                const displayValue = key === "education_level"
                  ? getEducationLevelLabel(stringValue)
                  : key === "facebook_link"
                    ? facebookUrl || stringValue
                    : stringValue;

                return (
                  <div key={key}>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    {key === "facebook_link" && facebookUrl ? (
                      <a
                        href={facebookUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-medium text-primary underline underline-offset-4 break-all hover:text-primary/80"
                      >
                        {displayValue}
                      </a>
                    ) : (
                      <p className="text-sm font-medium text-foreground">{displayValue}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminRecords;
