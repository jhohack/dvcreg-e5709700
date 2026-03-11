import { useEffect, useState } from "react";
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
import { departmentOptions, courseOptions, yearLevelOptions } from "@/lib/formOptions";
import { Link } from "react-router-dom";

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  middle_name: string | null;
  department: string | null;
  course: string | null;
  year_level: string | null;
  date_created: string;
  [key: string]: any;
}

const fieldLabels: Record<string, string> = {
  first_name: "First Name", last_name: "Last Name", middle_name: "Middle Name",
  date_of_birth: "Date of Birth", age: "Age", place_of_birth: "Place of Birth",
  gender: "Gender", civil_status: "Civil Status", spouse_name: "Spouse Name",
  nationality: "Nationality", religion: "Religion", tribe: "Tribe",
  vaccination_status: "Vaccination Status", address: "Permanent Address",
  current_address: "Current Address", contact: "Contact", facebook_link: "Facebook",
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
  student_lrn: "LRN", department: "Department", shs_track: "SHS Track",
  elem_school: "Elementary School", elem_address: "Elem. Address", elem_year: "Elem. Year",
  sec_school: "Secondary School", sec_address: "Sec. Address", sec_year: "Sec. Year",
  last_school: "Last School", last_school_address: "Last School Address",
  last_school_year: "Last School Year", course: "Course", year_level: "Year Level",
  date_created: "Date Registered",
};

const AdminRecords = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [courseFilter, setCourseFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [selected, setSelected] = useState<Student | null>(null);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("student_information")
      .select("*")
      .order("date_created", { ascending: false }) as any;
    if (!error && data) setStudents(data);
    setLoading(false);
  };

  const filtered = students.filter((s) => {
    const name = `${s.first_name} ${s.middle_name || ""} ${s.last_name}`.toLowerCase();
    if (search && !name.includes(search.toLowerCase())) return false;
    if (deptFilter && s.department !== deptFilter) return false;
    if (courseFilter && s.course !== courseFilter) return false;
    if (yearFilter && s.year_level !== yearFilter) return false;
    return true;
  });

  const clearFilters = () => {
    setSearch(""); setDeptFilter(""); setCourseFilter(""); setYearFilter("");
  };
  const hasFilters = search || deptFilter || courseFilter || yearFilter;

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
        {/* Filters */}
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
            <Select value={deptFilter} onValueChange={setDeptFilter}>
              <SelectTrigger className="w-[180px] h-10 bg-background"><SelectValue placeholder="Department" /></SelectTrigger>
              <SelectContent>
                {departmentOptions.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={courseFilter} onValueChange={setCourseFilter}>
              <SelectTrigger className="w-[220px] h-10 bg-background"><SelectValue placeholder="Course" /></SelectTrigger>
              <SelectContent>
                {courseOptions.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger className="w-[140px] h-10 bg-background"><SelectValue placeholder="Year Level" /></SelectTrigger>
              <SelectContent>
                {yearLevelOptions.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
            {hasFilters && (
              <Button variant="ghost" size="icon" onClick={clearFilters} className="h-10 w-10 shrink-0">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="section-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-3 font-semibold text-muted-foreground">Name</th>
                <th className="text-left py-3 px-3 font-semibold text-muted-foreground hidden md:table-cell">Department</th>
                <th className="text-left py-3 px-3 font-semibold text-muted-foreground hidden md:table-cell">Course</th>
                <th className="text-left py-3 px-3 font-semibold text-muted-foreground hidden sm:table-cell">Year Level</th>
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
                filtered.map((s) => (
                  <tr key={s.id} className="border-b border-border/50 hover:bg-muted/40 transition-colors">
                    <td className="py-3 px-3 font-medium text-foreground">
                      {s.last_name}, {s.first_name} {s.middle_name || ""}
                    </td>
                    <td className="py-3 px-3 text-muted-foreground hidden md:table-cell">{s.department || "—"}</td>
                    <td className="py-3 px-3 text-muted-foreground hidden md:table-cell">{s.course || "—"}</td>
                    <td className="py-3 px-3 text-muted-foreground hidden sm:table-cell">{s.year_level || "—"}</td>
                    <td className="py-3 px-3 text-muted-foreground hidden lg:table-cell">
                      {new Date(s.date_created).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-3">
                      <Button variant="ghost" size="icon" onClick={() => setSelected(s)} className="h-8 w-8">
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

      {/* Detail Modal */}
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
                const val = selected[key];
                if (!val && val !== 0) return null;
                return (
                  <div key={key}>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-sm font-medium text-foreground">{String(val)}</p>
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
