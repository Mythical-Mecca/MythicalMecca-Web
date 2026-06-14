"use client";

import { useState } from "react";
import { FileUploader } from "./file-uploader";
import { completeStep } from "@/app/(app)/hunts/actions";

export function PhotoStep({
  huntSlug,
  stepId,
}: {
  huntSlug: string;
  stepId: string;
}) {
  const [url, setUrl] = useState<string | null>(null);
  return (
    <div className="space-y-3">
      <FileUploader
        entityType="hunt_proof"
        multiple={false}
        onUploaded={setUrl}
      />
      {url && (
        <form action={completeStep}>
          <input type="hidden" name="huntSlug" value={huntSlug} />
          <input type="hidden" name="stepId" value={stepId} />
          <input type="hidden" name="fileUrl" value={url} />
          <button className="mm-btn mm-btn-primary text-sm">
            Submit proof
          </button>
        </form>
      )}
    </div>
  );
}
