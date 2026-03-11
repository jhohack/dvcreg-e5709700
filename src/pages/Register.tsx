import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { GraduationCap, User, MapPin, UserCheck, Heart, DollarSign, School, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import FormSection from "@/components/registration/FormSection";
import { TextField, SelectField, DateField } from "@/components/registration/FormField";
import {
  genderOptions, civilStatusOptions, vaccinationStatusOptions,
  departmentOptions, shsTrackOptions, courseOptions, yearLevelOptions,
  parentMaritalStatusOptions, religionOptions, tribeOptions,
} from "@/lib/formOptions";
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
  const showShsTrack = form.department === "Senior High School";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.first_name || !form.last_name || !form.gender || !form.department || !form.year_level) {
      toast.error("Please fill in all required fields.");
      return;
    }
    setLoading(true);
    const { religion_other, tribe_other, ...rest } = form;
    const payload = {
      ...rest,
      date_of_birth: form.date_of_birth ? form.date_of_birth.toISOString().split("T")[0] : null,
      age: form.age ? parseInt(form.age) : null,
      monthly_income: form.monthly_income ? parseFloat(form.monthly_income) : null,
      shs_track: showShsTrack ? form.shs_track : null,
      spouse_name: showSpouse ? form.spouse_name : null,
      religion: form.religion === "Other" ? religion_other || "Other" : form.religion,
      tribe: form.tribe === "Other" ? tribe_other || "Other" : form.tribe,
    };
    const { error } = await supabase.from("student_information").insert([payload] as any);
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
              <TextField label="Middle Name" name="middle_name" value={form.middle_name} onChange={set("middle_name")} />
              <TextField label="Last Name" name="last_name" required value={form.last_name} onChange={set("last_name")} />
              <DateField label="Date of Birth" name="date_of_birth" value={form.date_of_birth} onChange={setDate("date_of_birth")} />
              <TextField label="Age" name="age" type="number" value={form.age} onChange={set("age")} />
              <TextField label="Place of Birth" name="place_of_birth" value={form.place_of_birth} onChange={set("place_of_birth")} />
              <SelectField label="Gender" name="gender" required options={genderOptions} value={form.gender} onChange={set("gender")} />
              <SelectField label="Civil Status" name="civil_status" options={civilStatusOptions} value={form.civil_status} onChange={set("civil_status")} />
              {showSpouse && (
                <TextField label="Spouse Name" name="spouse_name" value={form.spouse_name} onChange={set("spouse_name")} />
              )}
              <SelectField label="Nationality" name="nationality" options={nationalityOptions} value={form.nationality} onChange={set("nationality")} />
              <SelectField label="Religion" name="religion" options={religionOptions} value={form.religion} onChange={set("religion")} />
              {form.religion === "Other" && (
                <TextField label="Specify Religion" name="religion_other" value={form.religion_other} onChange={set("religion_other")} />
              )}
              <SelectField label="Tribe / Ethnicity" name="tribe" options={tribeOptions} value={form.tribe} onChange={set("tribe")} />
              {form.tribe === "Other" && (
                <TextField label="Specify Tribe" name="tribe_other" value={form.tribe_other} onChange={set("tribe_other")} />
              )}
              <SelectField label="Vaccination Status" name="vaccination_status" options={vaccinationStatusOptions} value={form.vaccination_status} onChange={set("vaccination_status")} />
            </div>
          </FormSection>

          {/* Address & Contact */}
          <FormSection title="Address & Contact" description="Where we can reach you" icon={<MapPin className="h-4 w-4" />}>
            <div className="form-grid-2">
              <TextField label="Permanent Address" name="address" value={form.address} onChange={set("address")} />
              <TextField label="Current Address" name="current_address" value={form.current_address} onChange={set("current_address")} />
              <TextField label="Contact Number" name="contact" type="tel" value={form.contact} onChange={set("contact")} />
              <TextField label="Facebook Link" name="facebook_link" value={form.facebook_link} onChange={set("facebook_link")} />
            </div>
          </FormSection>

          {/* Parent/Guardian */}
          <FormSection title="Parent / Guardian" description="Primary and secondary guardian details" icon={<Users className="h-4 w-4" />}>
            <div className="space-y-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Primary Guardian</p>
              <div className="form-grid-2">
                <TextField label="Full Name" name="parent_guardian" value={form.parent_guardian} onChange={set("parent_guardian")} />
                <TextField label="Relation" name="parent_guardian_relation" value={form.parent_guardian_relation} onChange={set("parent_guardian_relation")} />
                <TextField label="Address" name="parent_guardian_address" value={form.parent_guardian_address} onChange={set("parent_guardian_address")} />
                <TextField label="Contact" name="parent_guardian_contact" type="tel" value={form.parent_guardian_contact} onChange={set("parent_guardian_contact")} />
              </div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider pt-2">Secondary Guardian</p>
              <div className="form-grid-2">
                <TextField label="Full Name" name="sec_parent_guardian" value={form.sec_parent_guardian} onChange={set("sec_parent_guardian")} />
                <TextField label="Relation" name="sec_parent_guardian_relation" value={form.sec_parent_guardian_relation} onChange={set("sec_parent_guardian_relation")} />
                <TextField label="Address" name="sec_parent_guardian_address" value={form.sec_parent_guardian_address} onChange={set("sec_parent_guardian_address")} />
                <TextField label="Contact" name="sec_parent_guardian_contact" type="tel" value={form.sec_parent_guardian_contact} onChange={set("sec_parent_guardian_contact")} />
              </div>
            </div>
          </FormSection>

          {/* Father */}
          <FormSection title="Father's Information" icon={<UserCheck className="h-4 w-4" />}>
            <div className="form-grid">
              <TextField label="First Name" name="father_first_name" value={form.father_first_name} onChange={set("father_first_name")} />
              <TextField label="Middle Name" name="father_middle_name" value={form.father_middle_name} onChange={set("father_middle_name")} />
              <TextField label="Last Name" name="father_last_name" value={form.father_last_name} onChange={set("father_last_name")} />
              <TextField label="Full Name" name="father_name" value={form.father_name} onChange={set("father_name")} />
              <TextField label="Occupation" name="father_occupation" value={form.father_occupation} onChange={set("father_occupation")} />
              <TextField label="Contact" name="father_contact" type="tel" value={form.father_contact} onChange={set("father_contact")} />
            </div>
          </FormSection>

          {/* Mother */}
          <FormSection title="Mother's Information" icon={<Heart className="h-4 w-4" />}>
            <div className="form-grid">
              <TextField label="First Name" name="mother_first_name" value={form.mother_first_name} onChange={set("mother_first_name")} />
              <TextField label="Middle Name" name="mother_middle_name" value={form.mother_middle_name} onChange={set("mother_middle_name")} />
              <TextField label="Last Name" name="mother_last_name" value={form.mother_last_name} onChange={set("mother_last_name")} />
              <TextField label="Full Name" name="mother_name" value={form.mother_name} onChange={set("mother_name")} />
              <TextField label="Occupation" name="mother_occupation" value={form.mother_occupation} onChange={set("mother_occupation")} />
              <TextField label="Contact" name="mother_contact" type="tel" value={form.mother_contact} onChange={set("mother_contact")} />
            </div>
          </FormSection>

          {/* Family / Income */}
          <FormSection title="Family & Income" description="Financial information" icon={<DollarSign className="h-4 w-4" />}>
            <div className="form-grid-2">
              <SelectField label="Parents' Marital Status" name="parent_marital_status" options={parentMaritalStatusOptions} value={form.parent_marital_status} onChange={set("parent_marital_status")} />
              <TextField label="Income Sources" name="income_sources" value={form.income_sources} onChange={set("income_sources")} />
              <TextField label="Other Income" name="other_income" value={form.other_income} onChange={set("other_income")} />
              <TextField label="Monthly Income" name="monthly_income" type="number" value={form.monthly_income} onChange={set("monthly_income")} />
            </div>
          </FormSection>

          {/* Academic */}
          <FormSection title="Academic Information" description="School and enrollment details" icon={<School className="h-4 w-4" />}>
            <div className="form-grid">
              <TextField label="Student LRN" name="student_lrn" value={form.student_lrn} onChange={set("student_lrn")} />
              <SelectField label="Department" name="department" required options={departmentOptions} value={form.department} onChange={set("department")} />
              {showShsTrack && (
                <SelectField label="SHS Track" name="shs_track" options={shsTrackOptions} value={form.shs_track} onChange={set("shs_track")} />
              )}
              <SelectField label="Course" name="course" options={courseOptions} value={form.course} onChange={set("course")} />
              <SelectField label="Year Level" name="year_level" required options={yearLevelOptions} value={form.year_level} onChange={set("year_level")} />
            </div>
            <div className="mt-4 space-y-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Educational Background</p>
              <div className="form-grid">
                <TextField label="Elementary School" name="elem_school" value={form.elem_school} onChange={set("elem_school")} />
                <TextField label="Elem. Address" name="elem_address" value={form.elem_address} onChange={set("elem_address")} />
                <TextField label="Year Graduated" name="elem_year" value={form.elem_year} onChange={set("elem_year")} />
                <TextField label="Secondary School" name="sec_school" value={form.sec_school} onChange={set("sec_school")} />
                <TextField label="Sec. Address" name="sec_address" value={form.sec_address} onChange={set("sec_address")} />
                <TextField label="Year Graduated" name="sec_year" value={form.sec_year} onChange={set("sec_year")} />
                <TextField label="Last School Attended" name="last_school" value={form.last_school} onChange={set("last_school")} />
                <TextField label="Last School Address" name="last_school_address" value={form.last_school_address} onChange={set("last_school_address")} />
                <TextField label="Last School Year" name="last_school_year" value={form.last_school_year} onChange={set("last_school_year")} />
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
