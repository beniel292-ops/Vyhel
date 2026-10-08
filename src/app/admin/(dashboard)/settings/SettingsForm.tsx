"use client";

import { AdminForm, FormSection, SubmitButton, TextArea, TextField } from "@/components/admin/form";
import type { SiteSettings } from "@/lib/settings-shape";
import { saveSettings } from "@/server/actions/settings";

export function SettingsForm({ s }: { s: SiteSettings }) {
  const problems = [...s.problems, ...Array.from({ length: Math.max(0, 6 - s.problems.length) }, () => ({ title: "", description: "", href: "" }))].slice(0, 6);
  return (
    <AdminForm action={saveSettings} className="grid gap-6">
      <FormSection title="Brand">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Site name" name="siteName" defaultValue={s.siteName} required />
          <TextField label="Tagline" name="tagline" defaultValue={s.tagline} />
        </div>
        <TextArea label="Homepage description" name="description" rows={2} defaultValue={s.description} />
        <p className="text-xs text-muted">The logo is the VYHEL wordmark, rendered as text so it stays crisp everywhere. The favicon lives at <code>src/app/icon.svg</code>.</p>
      </FormSection>

      <FormSection title="Amazon Associates" description="Vyhel stores your ID for reference and link checks. It never adds tags to links automatically.">
        <div className="grid gap-4 sm:grid-cols-3">
          <TextField label="Amazon Associate ID" name="amazonAssociateId" defaultValue={s.amazonAssociateId} placeholder="yourtag-21" />
          <TextField label="Marketplace" name="amazonMarketplace" defaultValue={s.amazonMarketplace} placeholder="amazon.in" />
          <TextField label="Default CTA text" name="defaultCtaText" defaultValue={s.defaultCtaText} />
        </div>
        <TextArea label="Affiliate disclosure" name="affiliateDisclosure" rows={2} defaultValue={s.affiliateDisclosure} hint="Shown in the footer, on guides, collections and product pages." />
      </FormSection>

      <FormSection title="Homepage: Start with the problem" description="Up to six prompts. Leave a title blank to remove a row.">
        <input type="hidden" name="__problems" value="1" />
        {problems.map((p, i) => (
          <div key={i} className="grid gap-3 rounded-md border border-line-soft p-3 sm:grid-cols-3">
            <TextField label={`Problem ${i + 1}`} name={`problem_title_${i}`} defaultValue={p.title} placeholder="Laptop getting hot?" />
            <TextField label="Leads to" name={`problem_description_${i}`} defaultValue={p.description} placeholder="Explore useful cooling accessories" />
            <TextField label="Link" name={`problem_href_${i}`} defaultValue={p.href} placeholder="/collections/better-desk" />
          </div>
        ))}
      </FormSection>

      <FormSection title="SEO defaults">
        <TextField label="Default title" name="seoDefaultTitle" defaultValue={s.seoDefaultTitle} />
        <TextArea label="Default description" name="seoDefaultDescription" rows={2} defaultValue={s.seoDefaultDescription} />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Default social image URL" name="defaultOgImage" defaultValue={s.defaultOgImage} hint="Leave blank to use the generated Vyhel card." />
          <TextField label="Search Console verification" name="searchConsoleVerification" defaultValue={s.searchConsoleVerification} placeholder="Content value of the meta tag" />
        </div>
        <TextField label="Google Analytics ID (optional)" name="googleAnalyticsId" defaultValue={s.googleAnalyticsId} placeholder="G-XXXXXXX" hint="Vyhel's own analytics work without this. Adding GA loads a third-party script — update the privacy policy accordingly." />
      </FormSection>

      <FormSection title="Contact & social">
        <div className="grid gap-4 sm:grid-cols-3">
          <TextField label="Contact email" name="contactEmail" type="email" defaultValue={s.contactEmail} />
          <TextField label="Instagram URL" name="instagramUrl" defaultValue={s.instagramUrl} />
          <TextField label="YouTube URL" name="youtubeUrl" defaultValue={s.youtubeUrl} />
        </div>
      </FormSection>

      <div className="flex justify-end">
        <SubmitButton size="lg">Save settings</SubmitButton>
      </div>
    </AdminForm>
  );
}
