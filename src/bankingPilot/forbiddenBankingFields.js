export const MAX_BANKING_PAYLOAD_DEPTH = 20;

export const MAX_DEPTH_SENTINEL = "__max_depth__";

export const FORBIDDEN_BANKING_FIELD_NAMES = Object.freeze([
  "password",
  "passcode",
  "pin",
  "otp",
  "mfa_code",
  "token_code",
  "card_number",
  "cvv",
  "expiry",
  "account_number",
  "bsb",
  "iban",
  "swift",
  "payee_name",
  "payee_account",
  "transaction_amount",
  "amount",
  "balance",
  "available_balance",
  "statement_line",
  "merchant_name",
  "payment_reference",
  "invoice_number",
  "raw_transaction",
  "transaction_history",
  "raw_statement",
  "bank_login",
  "customer_number",
  "netbank_id",
  "commbiz_token",
  "screen_pixels",
  "screenshot",
  "screen_recording",
  "webcam",
  "audio",
  "typed_content",
  "paste_content",
  "window_title",
  "process_name",
  "remote_app_name",
  "installed_app_name",
  "device_serial",
  "mac_address",
  "__proto__",
  "prototype",
  "constructor",
]);

export const STRUCTURAL_POLLUTION_KEYS = Object.freeze(["__proto__", "prototype", "constructor"]);

const FORBIDDEN_SET = new Set(FORBIDDEN_BANKING_FIELD_NAMES);
const POLLUTION_SET = new Set(STRUCTURAL_POLLUTION_KEYS);

export function containsForbiddenBankingFieldDeep(value, depth = 0) {
  if (!value || typeof value !== "object") return null;
  if (depth > MAX_BANKING_PAYLOAD_DEPTH) return MAX_DEPTH_SENTINEL;

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = containsForbiddenBankingFieldDeep(item, depth + 1);
      if (found) return found;
    }
    return null;
  }

  for (const [key, nested] of Object.entries(value)) {
    if (FORBIDDEN_SET.has(key)) return key;
    const found = containsForbiddenBankingFieldDeep(nested, depth + 1);
    if (found) return found;
  }

  return null;
}

export function isStructuralPollutionKey(fieldName) {
  return POLLUTION_SET.has(fieldName);
}
