import assert from "node:assert/strict";
import { test } from "node:test";
import { inspectAffiliateLink } from "../src/lib/amazon";
import { merchantDisplayName } from "../src/lib/merchant-name";

test("Amazon Special Link keeps the Associate tag and is recognised", () => {
  const r = inspectAffiliateLink("https://www.amazon.in/dp/B0QAQAQA77?tag=vyhel-21&linkCode=ll1", "vyhel-21");
  assert.equal(r.ok, true);
  assert.equal(r.isAmazon, true);
  assert.equal(r.tag, "vyhel-21");
  assert.equal(r.asin, "B0QAQAQA77");
  assert.deepEqual(r.warnings, []);
});

test("warns when the pasted tag differs from the configured Associate ID", () => {
  const r = inspectAffiliateLink("https://www.amazon.in/dp/B0QAQAQA77?tag=someone-21", "vyhel-21");
  assert.equal(r.ok, true);
  assert.match(r.warnings.join(" "), /differs from the Associate ID/);
});

test("rejects http:// and invalid URLs", () => {
  assert.equal(inspectAffiliateLink("http://www.amazon.in/dp/B0QAQAQA77?tag=vyhel-21").ok, false);
  assert.equal(inspectAffiliateLink("not a url").ok, false);
});

test("merchant names for CTAs", () => {
  assert.equal(merchantDisplayName("amazon", null), "Amazon");
  assert.equal(merchantDisplayName("flipkart", null), "Flipkart");
  assert.equal(merchantDisplayName("other", "Croma"), "Croma");
  assert.equal(merchantDisplayName("other", null, "https://www.croma.com/p/1"), "Croma");
  assert.equal(merchantDisplayName("direct", null, null), "the retailer");
});
