import { useState } from "react"; // registration form
import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { GraduationCap, User, MapPin, UserCheck, Heart, DollarSign, School, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import FormSection from "@/components/registration/FormSection";
import { TextField, SelectField, DateField, SchoolYearField } from "@/components/registration/FormField";
import {
  genderOptions, civilStatusOptions, vaccinationStatusOptions,
  departmentOptions, shsTrackOptions, courseOptions, yearLevelOptions,
  shsYearLevelOptions, collegeYearLevelOptions,
  parentMaritalStatusOptions, religionOptions, tribeOptions,
  incomeSourceOptions, monthlyIncomeOptions,
} from "@/lib/formOptions";
import { Checkbox } from "@/components/ui/checkbox";
import { nationalityOptions } from "@/lib/nationalities";

const initialForm = {
  first_name: "", last_name: "", middle_name: "",
  date_of_birth: undefined as Date | undefined,
  age: "", place_of_birth: "", gender: "", civil_status: "",
  spouse_name: "", nationality: "Filipino", religion: "", religion_other: "", tribe: "", tribe_other: "",
  vaccination_status: "",
  address: "", current_address: "", contact: "", facebook_link: "",
  father_first_name: "", father_middle_name: "", father_last_name: "",
  father_name: "", father_occupation: "", father_contact: "",
  mother_first_name: "", mother_middle_name: "", mother_last_name: "",
  mother_name: "", mother_occupation: "", mother_contact: "",
  parent_marital_status: "", income_sources: "", other_income: "",
  monthly_income: "",
  student_lrn: "", department: "", shs_track: "",
  elem_school: "", elem_address: "", elem_year: "",
  sec_school: "", sec_address: "", sec_year: "",
  last_school: "", last_school_address: "", last_school_year: "",
  course: "", year_level: "",
};

const Register = () => {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const set = (name: string) => (val: string) =>
    setForm((prev) => ({ ...prev, [name]: val }));
  const setDate = (name: string) => (val: Date | undefined) => {
    if (name === "date_of_birth" && val) {
      const today = new Date();
      let age = today.getFullYear() - val.getFullYear();
      const m = today.getMonth() - val.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < val.getDate())) age--;
      setForm((prev) => ({ ...prev, [name]: val, age: String(Math.max(0, age)) }));
    } else {
      setForm((prev) => ({ ...prev, [name]: val }));
    }
  };

  const showSpouse = ["Married", "Widowed", "Separated", "Divorced"].includes(form.civil_status);
  const isSHS = form.department === "Senior High School";
  const isCollege = form.department === "College";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.first_name || !form.last_name || !form.gender || !form.department || !form.year_level) {
      toast.error("Please fill in all required fields.");
      return;
    }
    setLoading(true);
    const { religion_other, tribe_other, ...rest } = form;
    const payload: TablesInsert<"admission"> = {
      ...rest,
      date_of_birth: form.date_of_birth ? form.date_of_birth.toISOString().split("T")[0] : null,
      age: form.age ? parseInt(form.age) : null,
      monthly_income: form.monthly_income ? parseInt(form.monthly_income.replace(/,/g, "")) : null,
      shs_track: isSHS ? form.shs_track : null,
      spouse_name: showSpouse ? form.spouse_name : null,
      religion: form.religion === "Other" ? religion_other || "Other" : form.religion,
      tribe: form.tribe === "Other" ? tribe_other || "Other" : form.tribe,
    };
    const { error } = await supabase.from("admission").insert([payload]);
    setLoading(false);
    if (error) {
      toast.error("Registration failed. Please try again.");
      console.error(error);
    } else {
      setSubmitted(true);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="section-card max-w-md w-full text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
            <CheckCircle2 className="h-8 w-8 text-success" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Registration Successful!</h1>
          <p className="text-muted-foreground">Your information has been submitted. You will be contacted for the next steps.</p>
          <Button onClick={() => { setForm(initialForm); setSubmitted(false); }} className="mt-4">
            Register Another Student
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-foreground leading-tight">Student Registration</h1>
            <p className="text-xs text-muted-foreground">Fill out all required fields to complete your enrollment</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6 md:py-10">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Basic Info */}
          <FormSection title="Basic Information" description="Personal details of the student" icon={<User className="h-4 w-4" />}>
            <div className="form-grid">
              <TextField label="First Name" name="first_name" required value={form.first_name} onChange={set("first_name")} />
              <TextField label="Middle Name" name="middle_name" required value={form.middle_name} onChange={set("middle_name")} />
              <TextField label="Last Name" name="last_name" required value={form.last_name} onChange={set("last_name")} />
              <DateField label="Date of Birth" name="date_of_birth" required value={form.date_of_birth} onChange={setDate("date_of_birth")} />
              <TextField label="Age" name="age" type="number" required value={form.age} onChange={set("age")} />
              <TextField label="Place of Birth" name="place_of_birth" required value={form.place_of_birth} onChange={set("place_of_birth")} />
              <SelectField label="Gender" name="gender" required options={genderOptions} value={form.gender} onChange={set("gender")} />
              <SelectField label="Civil Status" name="civil_status" required options={civilStatusOptions} value={form.civil_status} onChange={set("civil_status")} />
              {showSpouse && (
                <TextField label="Spouse Name" name="spouse_name" required value={form.spouse_name} onChange={set("spouse_name")} />
              )}
              <SelectField label="Nationality" name="nationality" required options={nationalityOptions} value={form.nationality} onChange={set("nationality")} />
              <SelectField label="Religion" name="religion" required options={religionOptions} value={form.religion} onChange={set("religion")} />
              {form.religion === "Other" && (
                <TextField label="Specify Religion" name="religion_other" required value={form.religion_other} onChange={set("religion_other")} />
              )}
              <SelectField label="Tribe / Ethnicity" name="tribe" required options={tribeOptions} value={form.tribe} onChange={set("tribe")} />
              {form.tribe === "Other" && (
                <TextField label="Specify Tribe" name="tribe_other" required value={form.tribe_other} onChange={set("tribe_other")} />
              )}
              <SelectField label="Vaccination Status" name="vaccination_status" required options={vaccinationStatusOptions} value={form.vaccination_status} onChange={set("vaccination_status")} />
            </div>
          </FormSection>

          {/* Address & Contact */}
          <FormSection title="Address & Contact" description="Where we can reach you" icon={<MapPin className="h-4 w-4" />}>
            <div className="form-grid-2">
              <TextField label="Permanent Address" name="address" required value={form.address} onChange={set("address")} />
              <TextField label="Current Address" name="current_address" required value={form.current_address} onChange={set("current_address")} />
              <TextField label="Contact Number" name="contact" type="tel" required value={form.contact} onChange={set("contact")} />
              <TextField label="Facebook Link" name="facebook_link" required value={form.facebook_link} onChange={set("facebook_link")} />
            </div>
          </FormSection>

          <FormSection title="Father's Information" icon={<UserCheck className="h-4 w-4" />}>
            <div className="form-grid">
              <TextField label="First Name" name="father_first_name" required value={form.father_first_name} onChange={set("father_first_name")} />
              <TextField label="Middle Name" name="father_middle_name" required value={form.father_middle_name} onChange={set("father_middle_name")} />
              <TextField label="Last Name" name="father_last_name" required value={form.father_last_name} onChange={set("father_last_name")} />
              
              <TextField label="Occupation" name="father_occupation" required value={form.father_occupation} onChange={set("father_occupation")} />
              <TextField label="Contact" name="father_contact" type="tel" required value={form.father_contact} onChange={set("father_contact")} />
            </div>
          </FormSection>

          {/* Mother */}
          <FormSection title="Mother's Information" icon={<Heart className="h-4 w-4" />}>
            <div className="form-grid">
              <TextField label="First Name" name="mother_first_name" required value={form.mother_first_name} onChange={set("mother_first_name")} />
              <TextField label="Middle Name" name="mother_middle_name" required value={form.mother_middle_name} onChange={set("mother_middle_name")} />
              <TextField label="Last Name" name="mother_last_name" required value={form.mother_last_name} onChange={set("mother_last_name")} />
              
              <TextField label="Occupation" name="mother_occupation" required value={form.mother_occupation} onChange={set("mother_occupation")} />
              <TextField label="Contact" name="mother_contact" type="tel" required value={form.mother_contact} onChange={set("mother_contact")} />
            </div>
          </FormSection>

          {/* Family / Income */}
          <FormSection title="Family & Income" description="Financial information" icon={<DollarSign className="h-4 w-4" />}>
            <div className="form-grid-2">
              <SelectField label="Parents' Marital Status" name="parent_marital_status" required options={parentMaritalStatusOptions} value={form.parent_marital_status} onChange={set("parent_marital_status")} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-foreground">Sources of Income (check as many as applicable) <span className="text-destructive">*</span></Label>
              <div className="grid grid-cols-2 gap-2">
                {incomeSourceOptions.map((src) => {
                  const selected = form.income_sources.split(",").filter(Boolean);
                  const checked = selected.includes(src);
                  return (
                    <label key={src} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) => {
                          const next = v ? [...selected, src] : selected.filter((s) => s !== src);
                          set("income_sources")(next.join(","));
                        }}
                      />
                      <span className="text-sm">{src}</span>
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="form-grid-2">
              <TextField label="Other Sources of Income" name="other_income" value={form.other_income} onChange={set("other_income")} placeholder="Type here" />
              <SelectField label="Ave. Monthly Income" name="monthly_income" required options={monthlyIncomeOptions} value={form.monthly_income} onChange={set("monthly_income")} placeholder="Select monthly income" />
            </div>
          </FormSection>

          {/* Academic */}
          <FormSection title="Academic Information" description="School and enrollment details" icon={<School className="h-4 w-4" />}>
            <div className="form-grid">
              <SelectField label="Department" name="department" required options={departmentOptions} value={form.department} onChange={set("department")} placeholder="Select your department" />
              <div className="space-y-1.5">
                <Label htmlFor="student_lrn" className="text-sm font-medium text-foreground">
                  LRN <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="student_lrn"
                  name="student_lrn"
                  type="text"
                  inputMode="numeric"
                  maxLength={12}
                  value={form.student_lrn}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 12);
                    set("student_lrn")(val);
                  }}
                  placeholder="12-digit LRN"
                  required
                  className="h-10 bg-background"
                />
              </div>
              {isCollege && (
                <SelectField label="Course" name="course" required options={courseOptions} value={form.course} onChange={set("course")} placeholder="Select your course" />
              )}
              {(isSHS || isCollege) && (
                <SelectField label={isSHS ? "Grade Level" : "Year Level"} name="year_level" required options={isSHS ? shsYearLevelOptions : collegeYearLevelOptions} value={form.year_level} onChange={(val) => { set("year_level")(val); set("shs_track")(""); }} placeholder={isSHS ? "Select your grade level" : "Select your year level"} />
              )}
              {isSHS && form.year_level === "Grade 11" && (
                <SelectField label="Strand" name="shs_track" required options={["Academic Track", "Tech Pro Track"]} value={form.shs_track} onChange={set("shs_track")} placeholder="Select your strand" />
              )}
              {isSHS && form.year_level === "Grade 12" && (
                <SelectField label="Strand" name="shs_track" required options={["HUMSS", "STEM", "ABM", "ICT", "GAS"]} value={form.shs_track} onChange={set("shs_track")} placeholder="Select your strand" />
              )}
              {!isSHS && !isCollege && form.department && (
                <>
                  <SelectField label="Year Level" name="year_level" required options={yearLevelOptions} value={form.year_level} onChange={set("year_level")} />
                  <SelectField label="Course" name="course" required options={courseOptions} value={form.course} onChange={set("course")} />
                </>
              )}
            </div>
            <div className="mt-4 space-y-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Educational Background</p>
              <div className="form-grid">
                {isSHS && (
                  <>
                    <TextField label="Elementary School" name="elem_school" required value={form.elem_school} onChange={set("elem_school")} />
                    <TextField label="Elem. Address" name="elem_address" required value={form.elem_address} onChange={set("elem_address")} />
                    <SchoolYearField label="School Year Attended" name="elem_year" required value={form.elem_year} onChange={set("elem_year")} />
                    <TextField label="Junior High School" name="sec_school" required value={form.sec_school} onChange={set("sec_school")} />
                    <TextField label="Jr. High Address" name="sec_address" required value={form.sec_address} onChange={set("sec_address")} />
                    <SchoolYearField label="School Year Attended" name="sec_year" required value={form.sec_year} onChange={set("sec_year")} />
                  </>
                )}
                {isCollege && (
                  <>
                    <TextField label="Junior High School" name="elem_school" required value={form.elem_school} onChange={set("elem_school")} />
                    <TextField label="Jr. High Address" name="elem_address" required value={form.elem_address} onChange={set("elem_address")} />
                    <SchoolYearField label="School Year Attended" name="elem_year" required value={form.elem_year} onChange={set("elem_year")} />
                    <TextField label="Senior High School" name="sec_school" required value={form.sec_school} onChange={set("sec_school")} />
                    <TextField label="Sr. High Address" name="sec_address" required value={form.sec_address} onChange={set("sec_address")} />
                    <SchoolYearField label="School Year Attended" name="sec_year" required value={form.sec_year} onChange={set("sec_year")} />
                  </>
                )}
                <TextField label="Last School Attended" name="last_school" required value={form.last_school} onChange={set("last_school")} />
                <TextField label="Last School Address" name="last_school_address" required value={form.last_school_address} onChange={set("last_school_address")} />
                <TextField label="School Year Attended" name="last_school_year" required value={form.last_school_year} onChange={set("last_school_year")} placeholder="YYYY" />
              </div>
            </div>
          </FormSection>

          <div className="flex justify-end pt-2 pb-8">
            <Button type="submit" size="lg" disabled={loading} className="min-w-[200px] h-12 text-base font-semibold">
              {loading ? "Submitting..." : "Submit Registration"}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default Register;
