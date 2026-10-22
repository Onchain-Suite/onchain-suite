import { z } from "zod";

export const personalInfoSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  protocolName: z
    .string()
    .min(1, "Protocol name is required to set up your account"),
  phoneNumber: z.string().optional(),
  // .refine(isValidPhoneNumber, { message: "Invalid phone number" }),
  marketingEmails: z.boolean(),
});

export type PersonalInfoFormData = z.infer<typeof personalInfoSchema>;

export const businessAddressSchema = z.object({
  addressLine1: z.string().min(1, "Enter your street address or P.O. box"),
  addressLine2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State/Province/Region is required"),
  zipCode: z.string().min(1, "Zip/Postal code is required"),
  country: z.string().min(1, "Country is required"),
});

export type BusinessAddressFormData = z.infer<typeof businessAddressSchema>;

export const businessGoalSchema = z.object({
  businessGoal: z.string().min(1, "Please select your top goal"),
});

export type BusinessGoalFormData = z.infer<typeof businessGoalSchema>;

export const contactCountSchema = z.object({
  contactCount: z.string().min(1, "Please select your contact range"),
});

export type ContactCountFormData = z.infer<typeof contactCountSchema>;

export const importantFeaturesSchema = z.object({
  importantFeatures: z
    .array(z.string())
    .min(1, "Please select at least one important feature"),
});

export type ImportantFeaturesFormData = z.infer<typeof importantFeaturesSchema>;

export const organizationTypeSchema = z.object({
  organizationTypes: z
    .array(z.string())
    .min(1, "Please select at least one organization type"),
});

export type OrganizationTypeFormData = z.infer<typeof organizationTypeSchema>;

export const planSelectionSchema = z.object({
  selectedPlan: z.string().min(1, "Please select a plan"),
});

export type PlanSelectionFormData = z.infer<typeof planSelectionSchema>;
