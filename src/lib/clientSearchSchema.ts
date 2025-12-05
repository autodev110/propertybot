import { z } from "zod";

export const clientSearchSchema = z.object({
  clientName: z.string().min(1, "Client name is required"),
  clientEmail: z.string().email("Valid email required"),
  preferredLocation: z.string().min(1, "Preferred location is required"),
  clientNotes: z.string().min(1, "Please provide client notes"),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
}).refine(
  (data) => {
    if (data.minPrice !== undefined && data.maxPrice !== undefined) {
      return data.maxPrice >= data.minPrice;
    }
    return true;
  },
  { message: "Max price must be greater than or equal to min price" }
);

export type ClientSearchInput = z.infer<typeof clientSearchSchema>;

export const selectPropertiesSchema = z.object({
  selectedPropertyIds: z.array(z.string()).min(1, "Select at least one property"),
});

export const emailDraftInputSchema = z.object({
  subject: z.string().min(5),
  body: z.string().min(20),
});
