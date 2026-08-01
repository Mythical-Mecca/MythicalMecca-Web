import { submitReview } from "@/app/(app)/actions";
import { TextareaField, CheckboxField } from "@/components/form";
import { PickerField } from "@/components/picker-field";
import { Icon } from "@/components/icon";

/**
 * Reusable partner-review submission form. Renders a plain
 * <form action={submitReview}> with hidden target fields, a 1–5 star picker, a
 * body textarea and an anonymous toggle. Logged-in only — submitted reviews
 * await admin approval.
 */
export function ReviewForm({
  targetType,
  targetId,
  partnerSlug,
}: {
  targetType: "partner";
  targetId?: string;
  partnerSlug?: string;
}) {
  return (
    <form action={submitReview} className="space-y-4">
      <input type="hidden" name="targetType" value={targetType} />
      {targetId && <input type="hidden" name="targetId" value={targetId} />}
      {partnerSlug && (
        <input type="hidden" name="partnerSlug" value={partnerSlug} />
      )}

      <PickerField
        name="rating"
        label="Rating"
        icon="mdi:star"
        defaultValue="5"
        options={[
          { value: "5", label: "★★★★★", hint: "Excellent" },
          { value: "4", label: "★★★★", hint: "Great" },
          { value: "3", label: "★★★", hint: "Good" },
          { value: "2", label: "★★", hint: "Fair" },
          { value: "1", label: "★", hint: "Poor" },
        ]}
      />

      <TextareaField
        label="Your review"
        icon="mdi:comment-quote-outline"
        name="body"
        rows={4}
        required
        minLength={4}
        maxLength={2000}
        placeholder="Tell other adventurers about your experience…"
      />

      <CheckboxField
        label="Post anonymously"
        icon="mdi:incognito"
        name="isAnonymous"
        description="Your name won't be shown publicly."
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-[var(--mm-text-dim)]">
          Reviews are approved by the Keep before appearing.
        </p>
        <button className="mm-btn mm-btn-primary text-sm">
          <Icon icon="mdi:send" width={16} /> Submit review
        </button>
      </div>
    </form>
  );
}

export default ReviewForm;
