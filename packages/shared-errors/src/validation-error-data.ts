export interface ValidationErrorData {
  fieldName: string;
  message: string;
  validationRule: string;
  additionalInfo?: Record<string, unknown>;
}
