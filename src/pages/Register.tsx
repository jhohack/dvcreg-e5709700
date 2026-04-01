import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { TablesInsert } from "@/integrations/supabase/types";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle2,
  DollarSign,
  GraduationCap,
  Heart,
  Mail,
  MapPin,
  RefreshCcw,
  School,
  ShieldCheck,
  User,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import FormSection from "@/components/registration/FormSection";
import { TextField, SelectField, DateField, SchoolYearField } from "@/components/registration/FormField";
import {
  genderOptions, civilStatusOptions, vaccinationStatusOptions,
  parentMaritalStatusOptions, religionOptions, tribeOptions,
  incomeSourceOptions, monthlyIncomeOptions,
} from "@/lib/formOptions";
import { Checkbox } from "@/components/ui/checkbox";
import { nationalityOptions } from "@/lib/nationalities";
import {
  fetchAcademicCatalog,
  getLegacyDepartmentLabel,
  normalizeEducationLevel,
} from "@/lib/academicCatalog";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

const FORM_STORAGE_KEY = "dvcreg-registration-form";
const VERIFICATION_STORAGE_KEY = "dvcreg-registration-verification";
const API_BASE = import.meta.env.DEV ? "/api" : "api";

const initialForm = {
  first_name: "", last_name: "", middle_name: "",
  date_of_birth: undefined as Date | undefined,
  age: "", place_of_birth: "", gender: "", civil_status: "",
  spouse_name: "", nationality: "Filipino", religion: "", religion_other: "", tribe: "", tribe_other: "",
  vaccination_status: "",
  address: "", current_address: "", contact: "", email: "", facebook_link: "",
  father_first_name: "", father_middle_name: "", father_last_name: "",
  father_name: "", father_occupation: "", father_contact: "",
  mother_first_name: "", mother_middle_name: "", mother_last_name: "",
  mother_name: "", mother_occupation: "", mother_contact: "",
  parent_marital_status: "", income_sources: "", other_income: "",
  monthly_income: "",
  student_lrn: "", education_level: "", department: "", shs_track: "",
  elem_school: "", elem_address: "", elem_year: "",
  sec_school: "", sec_address: "", sec_year: "",
  last_school: "", last_school_address: "", last_school_year: "",
  program: "", level: "", course: "", year_level: "",
};

type RegistrationForm = typeof initialForm;

type VerificationInfo = {
  verificationId: string;
  email: string;
  expiresAt: string;
};

type SendCodeResponse = {
  ok: boolean;
  verificationId: string;
  email: string;
  expiresAt: string;
  message?: string;
};

type VerifyCodeResponse = {
  ok: boolean;
  alreadyVerified?: boolean;
  message?: string;
};

const restoreForm = (): RegistrationForm => {
  if (typeof window === "undefined") {
    return initialForm;
  }

  try {
    const raw = window.sessionStorage.getItem(FORM_STORAGE_KEY);
    if (!raw) {
      return initialForm;
    }

    const parsed = JSON.parse(raw) as Partial<RegistrationForm> & { date_of_birth?: string | null };
    return {
      ...initialForm,
      ...parsed,
      date_of_birth: parsed.date_of_birth ? new Date(parsed.date_of_birth) : undefined,
    };
  } catch {
    return initialForm;
  }
};

const restoreVerificationInfo = (): VerificationInfo | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(VERIFICATION_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as VerificationInfo;
    if (!parsed.verificationId || !parsed.email || !parsed.expiresAt) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
};

const persistForm = (form: RegistrationForm) => {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(FORM_STORAGE_KEY, JSON.stringify({
    ...form,
    date_of_birth: form.date_of_birth ? form.date_of_birth.toISOString() : null,
  }));
};

const persistVerificationInfo = (verificationInfo: VerificationInfo | null) => {
  if (typeof window === "undefined") {
    return;
  }

  if (!verificationInfo) {
    window.sessionStorage.removeItem(VERIFICATION_STORAGE_KEY);
    return;
  }

  window.sessionStorage.setItem(VERIFICATION_STORAGE_KEY, JSON.stringify(verificationInfo));
};

const clearStoredRegistrationState = () => {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(FORM_STORAGE_KEY);
  window.sessionStorage.removeItem(VERIFICATION_STORAGE_KEY);
};

const buildSubmissionPayloads = ({
  form,
  selectedEducationLevel,
  isCollege,
  isSHS,
  showSpouse,
}: {
  form: RegistrationForm;
  selectedEducationLevel: string;
  isCollege: boolean;
  isSHS: boolean;
  showSpouse: boolean;
}) => {
  const {
    religion_other,
    tribe_other,
    education_level: _educationLevel,
    department: _department,
    shs_track: _shsTrack,
    program: _program,
    course: _course,
    level: _level,
    year_level: _yearLevel,
    ...rest
  } = form;

  const legacyPayload: TablesInsert<"admission"> = {
    ...rest,
    date_of_birth: form.date_of_birth ? form.date_of_birth.toISOString().split("T")[0] : null,
    age: form.age ? parseInt(form.age, 10) : null,
    monthly_income: form.monthly_income ? parseInt(form.monthly_income.replace(/,/g, ""), 10) : null,
    department: getLegacyDepartmentLabel(selectedEducationLevel) || null,
    course: isCollege ? form.program || null : null,
    shs_track: isSHS ? form.program || null : null,
    year_level: form.level || null,
    spouse_name: showSpouse ? form.spouse_name : null,
    religion: form.religion === "Other" ? religion_other || "Other" : form.religion,
    tribe: form.tribe === "Other" ? tribe_other || "Other" : form.tribe,
  };

  const payload: TablesInsert<"admission"> = {
    ...legacyPayload,
    education_level: selectedEducationLevel || null,
    program: form.program || null,
    level: form.level || null,
  };

  return { payload, legacyPayload };
};

const maskEmail = (email: string) => {
  const [localPart, domain = ""] = email.split("@");
  if (!localPart || !domain) {
    return email;
  }

  const visibleStart = localPart.slice(0, 2);
  const visibleEnd = localPart.length > 4 ? localPart.slice(-1) : "";
  const maskedMiddle = "*".repeat(Math.max(1, localPart.length - visibleStart.length - visibleEnd.length));
  return `${visibleStart}${maskedMiddle}${visibleEnd}@${domain}`;
};

const postJson = async <T,>(path: string, body: unknown): Promise<T> => {
  const response = await fetch(`${API_BASE}/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.ok) {
    throw new Error(data?.message || "Request failed.");
  }

  return data as T;
};

const Register = () => {
  const [form, setForm] = useState<RegistrationForm>(() => restoreForm());
  const [verificationInfo, setVerificationInfo] = useState<VerificationInfo | null>(() => restoreVerificationInfo());
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [resendingCode, setResendingCode] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const academicCatalogQuery = useQuery({
    queryKey: ["academic-catalog"],
    queryFn: fetchAcademicCatalog,
    staleTime: 1000 * 60 * 10,
  });

  useEffect(() => {
    if (!submitted) {
      persistForm(form);
    }
  }, [form, submitted]);

  useEffect(() => {
    if (!submitted) {
      persistVerificationInfo(verificationInfo);
    }
  }, [verificationInfo, submitted]);

  const set = (name: keyof RegistrationForm) => (val: string) =>
    setForm((prev) => ({ ...prev, [name]: val }));
  const setDate = (name: keyof RegistrationForm) => (val: Date | undefined) => {
    if (name === "date_of_birth" && val) {
      const today = new Date();
      let age = today.getFullYear() - val.getFullYear();
      const monthDelta = today.getMonth() - val.getMonth();
      if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < val.getDate())) age--;
      setForm((prev) => ({ ...prev, [name]: val, age: String(Math.max(0, age)) }));
    } else {
      setForm((prev) => ({ ...prev, [name]: val }));
    }
  };

  const showSpouse = ["Married", "Widowed", "Separated", "Divorced"].includes(form.civil_status);
  const selectedEducationLevel = normalizeEducationLevel(form.education_level || form.department);
  const isSHS = selectedEducationLevel === "shs";
  const isCollege = selectedEducationLevel === "college";
  const educationLevelOptions = academicCatalogQuery.data?.educationLevels ?? [];
  const programsForEducationLevel = selectedEducationLevel
    ? academicCatalogQuery.data?.programsByEducationLevel[selectedEducationLevel] ?? []
    : [];
  const availableShsLevels = isSHS
    ? academicCatalogQuery.data?.levelsByEducationLevel[selectedEducationLevel] ?? []
    : [];
  const availablePrograms = isSHS
    ? programsForEducationLevel.filter((program) =>
        form.level
          ? (academicCatalogQuery.data?.levelsByProgramId[program.id] ?? []).includes(form.level)
          : false
      )
    : programsForEducationLevel;
  const selectedProgram = programsForEducationLevel.find((program) => program.value === form.program);
  const availableLevels = isSHS
    ? availableShsLevels
    : selectedProgram
      ? academicCatalogQuery.data?.levelsByProgramId[selectedProgram.id] ?? []
      : [];

  const setEducationLevel = (value: string) =>
    setForm((prev) => ({
      ...prev,
      education_level: value,
      department: getLegacyDepartmentLabel(value),
      program: "",
      level: "",
      course: "",
      shs_track: "",
      year_level: "",
    }));

  const setProgram = (value: string) =>
    setForm((prev) => ({
      ...prev,
      program: value,
      level: isSHS ? prev.level : "",
      course: selectedEducationLevel === "college" ? value : "",
      shs_track: selectedEducationLevel === "shs" ? value : "",
      year_level: isSHS ? prev.year_level : "",
    }));

  const setLevel = (value: string) =>
    setForm((prev) => ({
      ...prev,
      level: value,
      program: isSHS ? "" : prev.program,
      course: isSHS ? "" : prev.course,
      shs_track: isSHS ? "" : prev.shs_track,
      year_level: value,
    }));

  const validateBeforeSendingCode = () => {
    if (!form.first_name || !form.last_name || !form.gender || !selectedEducationLevel || !form.program || !form.level || !form.email) {
      toast.error("Please fill in all required fields.");
      return false;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      toast.error("Please enter a valid email address.");
      return false;
    }

    if (academicCatalogQuery.isError) {
      toast.error("Academic options are unavailable right now. Please try again.");
      return false;
    }

    return true;
  };

  const startEmailVerification = async (mode: "initial" | "resend") => {
    if (!validateBeforeSendingCode()) {
      return;
    }

    const { payload, legacyPayload } = buildSubmissionPayloads({
      form,
      selectedEducationLevel,
      isCollege,
      isSHS,
      showSpouse,
    });

    if (mode === "resend") {
      setResendingCode(true);
    } else {
      setSendingCode(true);
    }

    try {
      const response = await postJson<SendCodeResponse>("send-verification-code.php", {
        email: form.email,
        payload,
        legacyPayload,
      });

      setVerificationInfo({
        verificationId: response.verificationId,
        email: response.email,
        expiresAt: response.expiresAt,
      });
      setVerificationCode("");
      toast.success(mode === "resend" ? "A new verification code was sent to your email." : "Verification code sent. Check your email.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send the verification code.");
    } finally {
      if (mode === "resend") {
        setResendingCode(false);
      } else {
        setSendingCode(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await startEmailVerification("initial");
  };

  const handleVerifyCode = async () => {
    if (!verificationInfo) {
      toast.error("Please request a verification code first.");
      return;
    }

    if (verificationCode.length !== 6) {
      toast.error("Enter the 6-digit verification code.");
      return;
    }

    setVerifyingCode(true);
    try {
      await postJson<VerifyCodeResponse>("verify-registration-code.php", {
        verificationId: verificationInfo.verificationId,
        code: verificationCode,
      });

      clearStoredRegistrationState();
      setVerificationInfo(null);
      setVerificationCode("");
      setSubmitted(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Verification failed.");
    } finally {
      setVerifyingCode(false);
    }
  };

  const handleBackToForm = () => {
    setVerificationInfo(null);
    setVerificationCode("");
  };

  const resetRegistration = () => {
    clearStoredRegistrationState();
    setForm(initialForm);
    setVerificationInfo(null);
    setVerificationCode("");
    setSubmitted(false);
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="section-card max-w-md w-full text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
            <CheckCircle2 className="h-8 w-8 text-success" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Registration Successful!</h1>
          <p className="text-muted-foreground">Your information has been verified and submitted successfully.</p>
          <Button onClick={resetRegistration} className="mt-4">
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
            <p className="text-xs text-muted-foreground">
              {verificationInfo ? "Verify your email before we save your registration" : "Fill out all required fields to complete your enrollment"}
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6 md:py-10">
        {verificationInfo ? (
          <div className="section-card mx-auto max-w-xl space-y-6">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <ShieldCheck className="h-7 w-7" />
              </div>
              <div className="space-y-1">
                <h2 className="text-2xl font-bold text-foreground">Verify Your Email</h2>
                <p className="text-sm text-muted-foreground">
                  We sent a 6-digit verification code to <span className="font-medium text-foreground">{maskEmail(verificationInfo.email)}</span>.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <div className="flex items-start gap-3">
                <Mail className="mt-0.5 h-5 w-5 text-primary" />
                <div className="space-y-1 text-sm">
                  <p className="font-medium text-foreground">Check your inbox</p>
                  <p className="text-muted-foreground">
                    Enter the code below. If you typed the wrong email address, go back to the form and update it without losing your entries.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="verification-code" className="text-sm font-medium text-foreground">
                Verification Code
              </Label>
              <div className="flex justify-center">
                <InputOTP
                  id="verification-code"
                  maxLength={6}
                  value={verificationCode}
                  onChange={setVerificationCode}
                  containerClassName="justify-center"
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <p className="text-center text-xs text-muted-foreground">
                This code expires at {new Date(verificationInfo.expiresAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button type="button" variant="outline" onClick={handleBackToForm} disabled={verifyingCode || resendingCode}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back To Form
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => startEmailVerification("resend")}
                disabled={sendingCode || verifyingCode || resendingCode}
              >
                <RefreshCcw className="mr-2 h-4 w-4" />
                {resendingCode ? "Sending Again..." : "Resend Code"}
              </Button>
              <Button type="button" onClick={handleVerifyCode} disabled={verifyingCode || verificationCode.length !== 6}>
                {verifyingCode ? "Verifying..." : "Verify And Submit"}
              </Button>
            </div>
          </div>
        ) : (
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
              <TextField label="Email Address" name="email" type="email" required value={form.email} onChange={set("email")} />
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
              <SelectField
                label="Education Level"
                name="education_level"
                required
                options={educationLevelOptions}
                value={selectedEducationLevel}
                onChange={setEducationLevel}
                placeholder={academicCatalogQuery.isLoading ? "Loading education levels..." : "Select your education level"}
              />
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
              {isSHS && (
                <SelectField
                  label="Level"
                  name="level"
                  required
                  options={availableLevels}
                  value={form.level}
                  onChange={setLevel}
                  placeholder="Select your level"
                />
              )}
              {selectedEducationLevel && (!isSHS || !!form.level) && (
                <SelectField
                  label="Program"
                  name="program"
                  required
                  options={availablePrograms}
                  value={form.program}
                  onChange={setProgram}
                  placeholder={
                    academicCatalogQuery.isLoading
                      ? "Loading programs..."
                      : "Select your program"
                  }
                />
              )}
              {selectedEducationLevel && !isSHS && (
                <SelectField
                  label="Level"
                  name="level"
                  required
                  options={availableLevels}
                  value={form.level}
                  onChange={setLevel}
                  placeholder={
                    form.program
                      ? "Select your level"
                      : "Select your program first"
                  }
                />
              )}
              {academicCatalogQuery.isError && (
                <p className="text-sm text-destructive">
                  Academic options could not be loaded from Supabase.
                </p>
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
            <Button type="submit" size="lg" disabled={sendingCode} className="min-w-[240px] h-12 text-base font-semibold">
              {sendingCode ? "Sending Code..." : "Send Verification Code"}
            </Button>
          </div>
        </form>
        )}
      </main>
    </div>
  );
};

export default Register;
