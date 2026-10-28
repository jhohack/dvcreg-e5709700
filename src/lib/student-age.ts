export const MIN_STUDENT_AGE = 15;

export const latestValidBirthdate = (today = new Date()) =>
  new Date(today.getFullYear() - MIN_STUDENT_AGE, today.getMonth(), today.getDate());

export const calculateAge = (birthdate: Date, today = new Date()) => {
  let age = today.getFullYear() - birthdate.getFullYear();
  const monthDelta = today.getMonth() - birthdate.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birthdate.getDate())) age--;
  return age;
};

export const isValidStudentBirthdate = (birthdate: Date, today = new Date()) =>
  !Number.isNaN(birthdate.getTime()) && birthdate <= latestValidBirthdate(today);
