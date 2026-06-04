import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { useQuery } from "@tanstack/react-query";
import type { TablesInsert } from "@/integrations/supabase/types";
import { toast } from "sonner";
import {
  ArrowLeft,
  BookOpen,
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
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import FormSection from "@/components/registration/FormSection";
import PhotoUploadDialog from "@/components/registration/PhotoUploadDialog";
import SignaturePadDialog from "@/components/registration/SignaturePadDialog";
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
import { normalizeFacebookLink } from "@/lib/facebook";
import { validateStudentPhoto } from "@/lib/photoValidation";
import {
  ACCEPTED_PHOTO_TYPES,
  MAX_PHOTO_SIZE_BYTES,
  processPhotoBackground,
} from "@/lib/photoProcessing";
import {
  buildRegistrationMediaDataUrl,
  deleteRegistrationMediaAsset,
  fileToBase64,
  fetchRegistrationMediaAsset,
  type RegistrationMediaAsset,
  storeRegistrationMediaAsset,
} from "@/lib/registrationMedia";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { supabase } from "@/integrations/supabase/client";

const FORM_STORAGE_KEY = "dvcreg-registration-form";
const VERIFICATION_STORAGE_KEY = "dvcreg-registration-verification";
const verificationServiceUnavailableMessage = "Verification service is unavailable right now. Please try again in a moment.";
const privacyNoticeText = [
  "By submitting this form, you consent to the collection, storage, and processing of your personal information, student photo, and signature for enrollment, verification, academic recordkeeping, and registrar processing.",
  "Your information is handled securely and is accessible only to authorized school personnel. It will not be sold or shared with unauthorized parties. By continuing, you acknowledge that you have read and understood this notice and agree to the use of your data for these official school purposes.",
];

const verificationFunctionByPath: Record<string, string> = {
  "send-verification-code.php": "send-verification-code",
  "verify-registration-code.php": "verify-registration-code",
};
const verificationApiBase = (import.meta.env.VITE_API_BASE_URL ?? "").trim().replace(/\/+$/, "");

const initialForm = {
  first_name: "", last_name: "", middle_name: "",
  date_of_birth: undefined as Date | undefined,
  age: "", place_of_birth: "", gender: "", civil_status: "",
  spouse_name: "", nationality: "Filipino", religion: "", religion_other: "", tribe: "", tribe_other: "",
  vaccination_status: "",
  address: "", current_address: "", same_as_permanent_address: false, contact: "", email: "", facebook_link: "",
  profile_photo_media_id: "",
  profile_photo_path: "", profile_photo_file_name: "",
  profile_photo_revision: "",
  signature_media_id: "",
  signature_path: "", signature_file_name: "",
  signature_revision: "",
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

type DuplicateNameResponse = {
  exists: boolean;
};

type VerifyCodeResponse = {
  ok: boolean;
  alreadyVerified?: boolean;
  message?: string;
};

const MEDIA_BUCKET = "registration-media";
const DRAFT_STORAGE_KEY = "dvcreg-registration-draft-id";
const ACCEPTED_MEDIA_TYPES = ACCEPTED_PHOTO_TYPES;
const MAX_MEDIA_SIZE_BYTES = MAX_PHOTO_SIZE_BYTES;
const MIN_STUDENT_AGE = 15;

const createRegistrationDraftId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  const hex = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
};

const restoreRegistrationDraftId = () => {
  if (typeof window === "undefined") {
    return createRegistrationDraftId();
  }

  try {
    const existing =
      window.localStorage.getItem(DRAFT_STORAGE_KEY) ||
      window.sessionStorage.getItem(DRAFT_STORAGE_KEY);
    if (existing) {
      try {
        window.localStorage.setItem(DRAFT_STORAGE_KEY, existing);
        window.sessionStorage.setItem(DRAFT_STORAGE_KEY, existing);
      } catch {
        // Existing draft can still be used even if storage sync is blocked.
      }
      return existing;
    }

    const next = createRegistrationDraftId();
    try {
      window.localStorage.setItem(DRAFT_STORAGE_KEY, next);
      window.sessionStorage.setItem(DRAFT_STORAGE_KEY, next);
    } catch {
      // The generated draft id still works for this page session.
    }
    return next;
  } catch {
    return createRegistrationDraftId();
  }
};

const persistRegistrationDraftId = (draftId: string) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(DRAFT_STORAGE_KEY, draftId);
    window.sessionStorage.setItem(DRAFT_STORAGE_KEY, draftId);
  } catch {
    // Draft persistence is helpful, but registration should continue if storage is blocked.
  }
};

const getMediaPath = (draftId: string, kind: "student-photo" | "student-signature") =>
  `registration-drafts/${draftId}/${kind}`;

const getMediaPublicUrl = (path: string) =>
  supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;

const getMediaPreviewUrl = (path: string, revision?: string | null) => {
  const publicUrl = getMediaPublicUrl(path);
  if (!revision) {
    return publicUrl;
  }

  const separator = publicUrl.includes("?") ? "&" : "?";
  return `${publicUrl}${separator}v=${encodeURIComponent(revision)}`;
};

const restoreForm = (): RegistrationForm => {
  if (typeof window === "undefined") {
    return initialForm;
  }

  try {
    const raw =
      window.localStorage.getItem(FORM_STORAGE_KEY) ||
      window.sessionStorage.getItem(FORM_STORAGE_KEY);
    if (!raw) {
      return initialForm;
    }

    const parsed = JSON.parse(raw) as Partial<RegistrationForm> & { date_of_birth?: string | null };
    try {
      window.localStorage.setItem(FORM_STORAGE_KEY, raw);
    } catch {
      // Restored data can still populate the form even if migration fails.
    }
    return {
      ...initialForm,
      ...parsed,
      current_address: parsed.same_as_permanent_address ? parsed.address ?? "" : parsed.current_address ?? "",
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

const formatLocalDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const calculateAge = (birthdate: Date, today = new Date()) => {
  let age = today.getFullYear() - birthdate.getFullYear();
  const monthDelta = today.getMonth() - birthdate.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birthdate.getDate())) {
    age--;
  }
  return age;
};

const isValidStudentAge = (birthdate: Date) => calculateAge(birthdate) >= MIN_STUDENT_AGE;

const hasFullNameWord = (value: string) => value
  .trim()
  .split(/[^\p{L}]+/u)
  .some((part) => part.length >= 2);

const persistForm = (form: RegistrationForm) => {
  if (typeof window === "undefined") {
    return;
  }

  const serialized = JSON.stringify({
    ...form,
    date_of_birth: form.date_of_birth ? form.date_of_birth.toISOString() : null,
  });

  try {
    window.localStorage.setItem(FORM_STORAGE_KEY, serialized);
    window.sessionStorage.setItem(FORM_STORAGE_KEY, serialized);
  } catch {
    // Keep the form usable even when browser storage is unavailable.
  }
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

  try {
    window.sessionStorage.removeItem(FORM_STORAGE_KEY);
    window.sessionStorage.removeItem(VERIFICATION_STORAGE_KEY);
    window.sessionStorage.removeItem(DRAFT_STORAGE_KEY);
    window.localStorage.removeItem(FORM_STORAGE_KEY);
    window.localStorage.removeItem(DRAFT_STORAGE_KEY);
  } catch {
    // Nothing else to do if browser storage cleanup is unavailable.
  }
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
    same_as_permanent_address: _sameAsPermanentAddress,
    profile_photo_media_id,
    profile_photo_path,
    profile_photo_file_name,
    profile_photo_revision,
    signature_media_id,
    signature_path,
    signature_file_name,
    signature_revision,
    ...legacyRest
  } = form;

  const legacyPayload: TablesInsert<"admission"> = {
    ...legacyRest,
    date_of_birth: form.date_of_birth ? formatLocalDate(form.date_of_birth) : null,
    age: form.age ? parseInt(form.age, 10) : null,
    monthly_income: form.monthly_income ? parseInt(form.monthly_income.replace(/,/g, ""), 10) : null,
    facebook_link: normalizeFacebookLink(form.facebook_link) || form.facebook_link.trim() || null,
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
    profile_photo_media_id: profile_photo_media_id || null,
    profile_photo_path: profile_photo_path || null,
    profile_photo_file_name: profile_photo_file_name || null,
    signature_media_id: signature_media_id || null,
    signature_path: signature_path || null,
    signature_file_name: signature_file_name || null,
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

const postJsonToEdgeFunction = async <T,>(path: string, body: unknown): Promise<T> => {
  const functionName = verificationFunctionByPath[path];
  if (!functionName) {
    throw new Error("Unsupported verification request.");
  }

  const { data, error } = await supabase.functions.invoke(functionName, {
    body,
  });

  if (error) {
    const functionError = error as Error & { context?: Response };

    if (functionError.context instanceof Response) {
      const responseData = await functionError.context.json().catch(() => null);
      if (responseData?.message) {
        throw new Error(responseData.message);
      }
    }

    throw new Error(functionError.message || verificationServiceUnavailableMessage);
  }

  if (!data?.ok) {
    throw new Error(data?.message || "Request failed.");
  }

  return data as T;
};

const postJsonToPhpApi = async <T,>(path: string, body: unknown): Promise<T> => {
  let response: Response;

  try {
    response = await fetch(`${verificationApiBase}/${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error(verificationServiceUnavailableMessage);
  }

  const responseData = await response.json().catch(() => null);
  if (!response.ok || !responseData?.ok) {
    throw new Error(responseData?.message || "Request failed.");
  }

  return responseData as T;
};

const postJson = async <T,>(path: string, body: unknown): Promise<T> => {
  if (verificationApiBase) {
    return await postJsonToPhpApi<T>(path, body);
  }

  if (verificationFunctionByPath[path]) {
    return await postJsonToEdgeFunction<T>(path, body);
  }

  throw new Error("Unsupported verification request.");
};

const Register = () => {
  const [form, setForm] = useState<RegistrationForm>(() => restoreForm());
  const [verificationInfo, setVerificationInfo] = useState<VerificationInfo | null>(() => restoreVerificationInfo());
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [resendingCode, setResendingCode] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [registrationDraftId, setRegistrationDraftId] = useState(() => restoreRegistrationDraftId());
  const [privacyNoticeOpen, setPrivacyNoticeOpen] = useState(false);
  const [privacyNoticeAgreed, setPrivacyNoticeAgreed] = useState(false);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [signaturePreviewUrl, setSignaturePreviewUrl] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [signatureUploading, setSignatureUploading] = useState(false);
  const [photoUploadError, setPhotoUploadError] = useState<string | null>(null);
  const [signatureUploadError, setSignatureUploadError] = useState<string | null>(null);
  const [dateOfBirthError, setDateOfBirthError] = useState<string | null>(null);
  const [debouncedNameCheck, setDebouncedNameCheck] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    dateOfBirth: "",
  });
  const academicCatalogQuery = useQuery({
    queryKey: ["academic-catalog"],
    queryFn: fetchAcademicCatalog,
    staleTime: 1000 * 60 * 10,
  });
  const nameCheckInput = {
    firstName: form.first_name.trim(),
    middleName: form.middle_name.trim(),
    lastName: form.last_name.trim(),
    dateOfBirth: form.date_of_birth ? formatLocalDate(form.date_of_birth) : "",
  };
  const hasFullNameForCheck = Boolean(nameCheckInput.firstName && nameCheckInput.middleName && nameCheckInput.lastName && nameCheckInput.dateOfBirth);
  const checkDuplicateName = async (): Promise<DuplicateNameResponse> => {
    const rpcClient = supabase as unknown as {
      rpc: (
        functionName: "registration_full_name_exists",
        args: { p_first_name: string; p_middle_name: string; p_last_name: string; p_date_of_birth: string },
      ) => Promise<{ data: boolean | null; error: Error | null }>;
    };
    const { data, error } = await rpcClient.rpc("registration_full_name_exists", {
      p_first_name: debouncedNameCheck.firstName,
      p_middle_name: debouncedNameCheck.middleName,
      p_last_name: debouncedNameCheck.lastName,
      p_date_of_birth: debouncedNameCheck.dateOfBirth,
    });

    if (error) {
      throw error;
    }

    return { exists: data === true };
  };
  const duplicateNameQuery = useQuery({
    queryKey: ["duplicate-registration-name", debouncedNameCheck],
    queryFn: checkDuplicateName,
    enabled: Boolean(debouncedNameCheck.firstName && debouncedNameCheck.middleName && debouncedNameCheck.lastName && debouncedNameCheck.dateOfBirth),
    retry: false,
    staleTime: 1000 * 30,
  });
  const nameCheckMatchesCurrentInput = hasFullNameForCheck
    && debouncedNameCheck.firstName === nameCheckInput.firstName
    && debouncedNameCheck.middleName === nameCheckInput.middleName
    && debouncedNameCheck.lastName === nameCheckInput.lastName
    && debouncedNameCheck.dateOfBirth === nameCheckInput.dateOfBirth;
  const duplicateNameExists = nameCheckMatchesCurrentInput && duplicateNameQuery.data?.exists === true;
  const duplicateNameChecking = hasFullNameForCheck && (!nameCheckMatchesCurrentInput || duplicateNameQuery.isFetching);

  useEffect(() => {
    if (!hasFullNameForCheck) {
      setDebouncedNameCheck({ firstName: "", middleName: "", lastName: "", dateOfBirth: "" });
      return;
    }

    setDebouncedNameCheck(nameCheckInput);
  }, [hasFullNameForCheck, nameCheckInput.firstName, nameCheckInput.middleName, nameCheckInput.lastName, nameCheckInput.dateOfBirth]);

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

  useEffect(() => {
    persistRegistrationDraftId(registrationDraftId);
  }, [registrationDraftId]);

  useEffect(() => {
    return () => {
      if (photoPreviewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(photoPreviewUrl);
      }
    };
  }, [photoPreviewUrl]);

  useEffect(() => {
    return () => {
      if (signaturePreviewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(signaturePreviewUrl);
      }
    };
  }, [signaturePreviewUrl]);

  const set = (name: keyof RegistrationForm) => (val: string) =>
    setForm((prev) => ({ ...prev, [name]: val }));
  const setDate = (name: keyof RegistrationForm) => (val: Date | undefined) => {
    if (name === "date_of_birth" && val) {
      const age = calculateAge(val);
      if (age < MIN_STUDENT_AGE) {
        const message = `Student must be at least ${MIN_STUDENT_AGE} years old.`;
        setDateOfBirthError(message);
        toast.error(message);
        setForm((prev) => ({ ...prev, [name]: undefined, age: "" }));
        return;
      }

      setDateOfBirthError(null);
      setForm((prev) => ({ ...prev, [name]: val, age: String(Math.max(0, age)) }));
    } else {
      if (name === "date_of_birth") {
        setDateOfBirthError(null);
      }
      setForm((prev) => ({ ...prev, [name]: val }));
    }
  };
  const setPermanentAddress = (value: string) =>
    setForm((prev) => ({
      ...prev,
      address: value,
      current_address: prev.same_as_permanent_address ? value : prev.current_address,
    }));
  const setSameAsPermanentAddress = (checked: boolean) =>
    setForm((prev) => ({
      ...prev,
      same_as_permanent_address: checked,
      current_address: checked ? prev.address : prev.current_address,
    }));

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
  const facebookProfileLink = normalizeFacebookLink(form.facebook_link);
  const facebookInput = form.facebook_link.trim();
  const profilePhotoMediaQuery = useQuery({
    queryKey: ["registration-media-asset", form.profile_photo_media_id],
    queryFn: () => fetchRegistrationMediaAsset(form.profile_photo_media_id || ""),
    enabled: !photoPreviewUrl && Boolean(form.profile_photo_media_id),
    staleTime: Infinity,
  });
  const signatureMediaQuery = useQuery({
    queryKey: ["registration-media-asset", form.signature_media_id],
    queryFn: () => fetchRegistrationMediaAsset(form.signature_media_id || ""),
    enabled: !signaturePreviewUrl && Boolean(form.signature_media_id),
    staleTime: Infinity,
  });

  const replacePreviewUrl = (
    setter: Dispatch<SetStateAction<string | null>>,
    nextUrl: string | null,
  ) => {
    setter((current) => {
      if (current?.startsWith("blob:")) {
        URL.revokeObjectURL(current);
      }

      return nextUrl;
    });
  };

  const validateMediaFile = (file: File, fieldLabel: string) => {
    if (!ACCEPTED_MEDIA_TYPES.has(file.type)) {
      return `${fieldLabel} must be a JPG, PNG, or WEBP image.`;
    }

    if (file.size > MAX_MEDIA_SIZE_BYTES) {
      return `${fieldLabel} must be 5 MB or smaller.`;
    }

    return null;
  };

  const uploadMediaFile = async ({
    file,
    kind,
  }: {
    file: File;
    kind: "photo" | "signature";
  }): Promise<boolean> => {
    const label = kind === "photo" ? "The photo" : "The signature";
    const previewSetter = kind === "photo" ? setPhotoPreviewUrl : setSignaturePreviewUrl;
    const errorSetter = kind === "photo" ? setPhotoUploadError : setSignatureUploadError;
    const uploadingSetter = kind === "photo" ? setPhotoUploading : setSignatureUploading;
    const mediaKind = kind === "photo" ? "profile_photo" : "signature";

    const validationError = validateMediaFile(file, label);
    if (validationError) {
      errorSetter(validationError);
      toast.error(validationError);
      return false;
    }

    errorSetter(null);

    try {
      if (kind === "photo") {
        const validation = await validateStudentPhoto(file);
        if (!validation.ok) {
          throw new Error(validation.reason);
        }
      }

      uploadingSetter(true);
      const fileToUpload = kind === "photo"
        ? await processPhotoBackground(file)
        : file;
      const localPreviewUrl = URL.createObjectURL(fileToUpload);
      replacePreviewUrl(previewSetter, localPreviewUrl);

      const storedAsset = await storeRegistrationMediaAsset({
        registrationDraftId,
        mediaKind,
        fileName: fileToUpload.name,
        contentType: fileToUpload.type || file.type || "application/octet-stream",
        contentBase64: await fileToBase64(fileToUpload),
      });

      setForm((prev) =>
        kind === "photo"
          ? {
              ...prev,
              profile_photo_media_id: storedAsset.media_id,
              profile_photo_path: "",
              profile_photo_file_name: storedAsset.file_name,
              profile_photo_revision: String(Date.now()),
            }
          : {
              ...prev,
              signature_media_id: storedAsset.media_id,
              signature_path: "",
              signature_file_name: storedAsset.file_name,
              signature_revision: String(Date.now()),
            }
      );
    } catch (error) {
      replacePreviewUrl(previewSetter, null);
      errorSetter(error instanceof Error ? error.message : `Could not upload ${kind === "photo" ? "the photo" : "the signature"}.`);
      toast.error(error instanceof Error ? error.message : `Could not upload ${kind === "photo" ? "the photo" : "the signature"}.`);
      return false;
    } finally {
      uploadingSetter(false);
    }

    return true;
  };

  const handlePhotoUpload = async (file: File | null) => {
    if (!file) {
      return false;
    }

    return await uploadMediaFile({ file, kind: "photo" });
  };

  const handleRemotePhotoReady = (asset: RegistrationMediaAsset) => {
    if (asset.media_kind !== "profile_photo" || !asset.content_base64) {
      return;
    }

    replacePreviewUrl(setPhotoPreviewUrl, buildRegistrationMediaDataUrl(asset));
    setPhotoUploadError(null);
    setForm((prev) => ({
      ...prev,
      profile_photo_media_id: asset.media_id,
      profile_photo_path: "",
      profile_photo_file_name: asset.file_name,
      profile_photo_revision: String(Date.now()),
    }));
  };

  const handleSignatureUpload = async (file: File | null) => {
    if (!file) {
      return false;
    }

    return await uploadMediaFile({ file, kind: "signature" });
  };

  const clearMediaField = (kind: "photo" | "signature") => {
    const previewSetter = kind === "photo" ? setPhotoPreviewUrl : setSignaturePreviewUrl;
    const errorSetter = kind === "photo" ? setPhotoUploadError : setSignatureUploadError;
    const mediaKind = kind === "photo" ? "profile_photo" : "signature";

    void (async () => {
      const currentMediaId = kind === "photo" ? form.profile_photo_media_id : form.signature_media_id;
      const currentPath = kind === "photo" ? form.profile_photo_path : form.signature_path;

      try {
        if (currentMediaId) {
          await deleteRegistrationMediaAsset({
            registrationDraftId,
            mediaKind,
          });
        } else if (currentPath) {
          await supabase.storage.from(MEDIA_BUCKET).remove([currentPath]);
        }
      } catch (error) {
        console.warn("Could not clear stored registration media.", error);
      }
    })();

    replacePreviewUrl(previewSetter, null);
    errorSetter(null);

    setForm((prev) =>
        kind === "photo"
          ? {
              ...prev,
              profile_photo_media_id: "",
              profile_photo_path: "",
              profile_photo_file_name: "",
              profile_photo_revision: "",
            }
          : {
              ...prev,
              signature_media_id: "",
              signature_path: "",
              signature_file_name: "",
              signature_revision: "",
            }
    );
  };

  const mediaIsUploading = photoUploading || signatureUploading;
  const profilePhotoPreviewSrc = photoPreviewUrl ?? (
    profilePhotoMediaQuery.data
      ? buildRegistrationMediaDataUrl(profilePhotoMediaQuery.data)
      : form.profile_photo_path
        ? getMediaPreviewUrl(form.profile_photo_path, form.profile_photo_revision)
        : null
  );
  const signaturePreviewSrc = signaturePreviewUrl ?? (
    signatureMediaQuery.data
      ? buildRegistrationMediaDataUrl(signatureMediaQuery.data)
      : form.signature_path
        ? getMediaPreviewUrl(form.signature_path, form.signature_revision)
        : null
  );
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
    if (photoUploading || signatureUploading) {
      toast.error("Please wait for the photo and signature uploads to finish.");
      return false;
    }

    if (!form.profile_photo_media_id && !form.profile_photo_path) {
      toast.error("Please upload the student's formal photo.");
      return false;
    }

    if (!form.signature_media_id && !form.signature_path) {
      toast.error("Please upload the student's signature.");
      return false;
    }

    if (!form.first_name || !form.middle_name || !form.last_name || !form.date_of_birth || !form.gender || !selectedEducationLevel || !form.program || !form.level || !form.email) {
      toast.error("Please fill in all required fields.");
      return false;
    }

    if (!hasFullNameWord(form.middle_name)) {
      toast.error("Middle name must be a full word, not a single letter or initial.");
      return false;
    }

    if (!isValidStudentAge(form.date_of_birth)) {
      toast.error(`Student must be at least ${MIN_STUDENT_AGE} years old.`);
      return false;
    }

    if (duplicateNameChecking) {
      toast.error("Please wait while we check the student's full name.");
      return false;
    }

    if (duplicateNameExists) {
      toast.error("This full name is already registered.");
      return false;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      toast.error("Please enter a valid email address.");
      return false;
    }

    if (!form.facebook_link.trim()) {
      toast.error("Please enter your Facebook username, profile URL, or exact Facebook name.");
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
      if (mode === "initial") {
        setPrivacyNoticeOpen(false);
        setPrivacyNoticeAgreed(false);
      }
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
    if (!validateBeforeSendingCode()) {
      return;
    }

    setPrivacyNoticeAgreed(false);
    setPrivacyNoticeOpen(true);
  };

  const handlePrivacyNoticeOpenChange = (open: boolean) => {
    if (!open && sendingCode) {
      return;
    }

    setPrivacyNoticeOpen(open);

    if (!open) {
      setPrivacyNoticeAgreed(false);
    }
  };

  const handlePrivacyNoticeConfirm = async () => {
    if (!privacyNoticeAgreed || sendingCode) {
      return;
    }

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
    const nextDraftId = createRegistrationDraftId();
    persistRegistrationDraftId(nextDraftId);
    setRegistrationDraftId(nextDraftId);
    replacePreviewUrl(setPhotoPreviewUrl, null);
    replacePreviewUrl(setSignaturePreviewUrl, null);
    setPhotoUploading(false);
    setSignatureUploading(false);
    setPhotoUploadError(null);
    setSignatureUploadError(null);
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
        <Dialog open={privacyNoticeOpen} onOpenChange={handlePrivacyNoticeOpenChange}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary sm:mx-0">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <DialogTitle className="text-2xl font-bold">Privacy Notice</DialogTitle>
              <DialogDescription className="text-sm leading-6">
                Please review this notice before we send your verification code.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 rounded-2xl border border-border bg-muted/30 p-4 text-sm leading-7 text-muted-foreground">
              {privacyNoticeText.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>

            <div className="flex items-start gap-3 rounded-2xl border border-border bg-background p-4">
              <Checkbox
                id="privacy-notice-agreement"
                checked={privacyNoticeAgreed}
                onCheckedChange={(checked) => setPrivacyNoticeAgreed(checked === true)}
                disabled={sendingCode}
                className="mt-1"
              />
              <div className="space-y-1">
                <Label
                  htmlFor="privacy-notice-agreement"
                  className="cursor-pointer text-sm font-medium text-foreground"
                >
                  I have read and agree to the Privacy Notice.
                </Label>
                <p className="text-xs leading-5 text-muted-foreground">
                  The Confirm button will become available once you check this box.
                </p>
              </div>
            </div>

            <DialogFooter className="sm:justify-between">
              <p className="text-xs leading-5 text-muted-foreground sm:max-w-[60%]">
                By confirming, you authorize the school to use your submitted information for enrollment and registrar processing.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handlePrivacyNoticeOpenChange(false)}
                  disabled={sendingCode}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handlePrivacyNoticeConfirm}
                  disabled={!privacyNoticeAgreed || sendingCode}
                >
                  {sendingCode ? "Sending Code..." : "Confirm"}
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
              {(dateOfBirthError || duplicateNameExists) && (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm font-medium text-destructive sm:col-span-2 lg:col-span-3">
                  {dateOfBirthError || "This full name is already registered."}
                </div>
              )}
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
              <TextField label="Permanent Address" name="address" required value={form.address} onChange={setPermanentAddress} />
              <div className="space-y-2">
                <TextField
                  label="Current Address"
                  name="current_address"
                  required
                  value={form.current_address}
                  onChange={set("current_address")}
                  disabled={form.same_as_permanent_address}
                  placeholder={form.same_as_permanent_address ? "Copied from permanent address" : "Current address"}
                />
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="same_as_permanent_address"
                    checked={form.same_as_permanent_address}
                    onCheckedChange={(checked) => setSameAsPermanentAddress(checked === true)}
                  />
                  <Label
                    htmlFor="same_as_permanent_address"
                    className="cursor-pointer text-sm font-medium text-muted-foreground"
                  >
                    Same as permanent address
                  </Label>
                </div>
              </div>
              <TextField label="Contact Number" name="contact" type="tel" required value={form.contact} onChange={set("contact")} />
              <TextField label="Email Address" name="email" type="email" required value={form.email} onChange={set("email")} />
              <div className="space-y-1.5">
                <TextField
                  label="Facebook Username or Profile URL"
                  name="facebook_link"
                  required
                  value={form.facebook_link}
                  onChange={set("facebook_link")}
                  placeholder="jhoroseland.firmeza or https://web.facebook.com/jhoroseland.firmeza"
                />
                {facebookInput ? (
                  facebookProfileLink ? (
                    <a
                      href={facebookProfileLink}
                      target="_blank"
                      rel="noreferrer"
                      className="block text-xs break-all text-primary underline underline-offset-4 hover:text-primary/80"
                    >
                      Preview link: {facebookProfileLink}
                    </a>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      If you only remember the Facebook name, you can keep it here and the registrar will verify it manually.
                    </p>
                  )
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Paste your Facebook username or the exact profile URL from the address bar. If you forgot the link, enter the exact Facebook name and we will verify it manually.
                  </p>
                )}
              </div>
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

          <FormSection
            title="Educational Background"
            description="Previous schools attended by the student."
            icon={<BookOpen className="h-4 w-4" />}
          >
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
              <SchoolYearField label="School Year Attended" name="last_school_year" required value={form.last_school_year} onChange={set("last_school_year")} />
            </div>
          </FormSection>

          <FormSection
            title="Enrollment Selection"
            description="Select the education level, program, and level the student will enroll in."
            icon={<School className="h-4 w-4" />}
          >
            <div className="form-grid">
              <SelectField
                label="Education Level to Enroll"
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
          </FormSection>

          <FormSection
            title="Student Photo & Signature"
            description="Upload the required formal photo. The server will automatically clean the background to white before submitting, then draw the handwritten signature."
            icon={<ShieldCheck className="h-4 w-4" />}
          >
            <div className="rounded-2xl border border-border bg-muted/30 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <p className="font-semibold text-foreground">Both items are required for application review.</p>
                  <p className="text-sm leading-6 text-muted-foreground">
                    Use the buttons below to open the guided photo and signature modals. Each modal shows the rules and
                    will reject invalid uploads.
                  </p>
                </div>
                <Badge variant="outline" className="w-fit border-destructive/30 bg-destructive/5 text-destructive">
                  Rejected if incorrect
                </Badge>
              </div>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <PhotoUploadDialog
              previewUrl={profilePhotoPreviewSrc}
              fileName={form.profile_photo_file_name || null}
              registrationDraftId={registrationDraftId}
              uploading={photoUploading}
              error={photoUploadError}
              onUploadFile={handlePhotoUpload}
              onRemotePhotoReady={handleRemotePhotoReady}
              onClear={() => clearMediaField("photo")}
            />

              <SignaturePadDialog
                previewUrl={signaturePreviewSrc}
                fileName={form.signature_file_name || null}
                uploading={signatureUploading}
                error={signatureUploadError}
                onUploadFile={handleSignatureUpload}
                onClear={() => clearMediaField("signature")}
              />
            </div>
          </FormSection>

          <div className="flex flex-col gap-3 pt-2 pb-8 sm:flex-row sm:items-center sm:justify-end">
            <Button
              type="submit"
              size="lg"
              disabled={sendingCode || mediaIsUploading || duplicateNameChecking || duplicateNameExists}
              className="h-12 min-w-[240px] text-base font-semibold"
            >
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
