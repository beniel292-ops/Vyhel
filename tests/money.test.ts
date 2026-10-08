import assert from "node:assert/strict";
import { test } from "node:test";
import { formatMoney, maskEmail, parseRupeesToMinor } from "../src/lib/money";

test("parses rupee strings to paise exactly", () => {
  assert.equal(parseRupeesToMinor("499"), 49900);
  assert.equal(parseRupeesToMinor("499.5"), 49950);
  assert.equal(parseRupeesToMinor("₹1,299.99"), 129999);
  assert.equal(parseRupeesToMinor("0.1"), 10);
});

test("rejects ambiguous or invalid amounts", () => {
  for (const bad of ["", "abc", "1.234", "-5", "1e3", "12.3.4"]) assert.equal(parseRupeesToMinor(bad), null, bad);
});

test("formats INR and masks emails", () => {
  assert.match(formatMoney(49900), /₹\s?499/);
  assert.equal(maskEmail("beni@example.com").endsWith("@example.com"), true);
  assert.equal(maskEmail("beni@example.com").includes("beni"), false);
});
