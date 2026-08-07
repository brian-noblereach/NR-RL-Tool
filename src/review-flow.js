import { getCategoryLabel } from "./category-labels.js";

export function getReviewFlowConfig({ isExternal, ventureName } = {}) {
  const safeVentureName = String(ventureName || "").trim() || "this assessment";

  if (isExternal) {
    return {
      mode: "external-pdf",
      title: `Review & save ${safeVentureName} as a PDF?`,
      intro: "Review the assessment before downloading a PDF. Call commentary is optional for external assessments.",
      checklistTitle: "PDF Checklist",
      footerNote: "The PDF downloads after you click Download PDF. Nothing is sent to the NobleReach database.",
      confirmLabel: "Download PDF",
      confirmTitleReady: "Download PDF",
      confirmTitleBlocked: "Complete required fields before downloading",
      requiresMetadata: true,
      requiresCompleteScores: false,
      requiresCommentary: false,
      canConfirm(readiness, metadataMissing = []) {
        return metadataMissing.length === 0;
      },
    };
  }

  return {
    mode: "internal-database",
    title: `Review & save ${safeVentureName} to the NobleReach database?`,
    intro: "Review completeness and add required founder-call commentary before writing this row to the database.",
    checklistTitle: "Submission Checklist",
    footerNote: "Nothing is saved to the database until you click Submit to Database.",
    confirmLabel: "Submit to Database",
    confirmTitleReady: "Submit to database",
    confirmTitleBlocked: "Complete all checklist items before submitting",
    requiresMetadata: true,
    requiresCompleteScores: true,
    requiresCommentary: true,
    canConfirm(readiness, metadataMissing = []) {
      return Boolean(readiness?.canSubmit) && metadataMissing.length === 0;
    },
  };
}

export function buildReviewChecklist({ config, readiness, metadataMissing = [] }) {
  const missingScores = readiness?.missingScores || [];
  const missingCommentary = readiness?.missingCommentary || [];
  const isExternal = config?.mode === "external-pdf";

  const metadataLabel = isExternal
    ? "Required venture and name fields complete"
    : "Required venture, advisor, and portfolio fields complete";

  const scoreLabel = missingScores.length === 0
    ? "All active categories scored"
    : isExternal
      ? `Partial PDF warning: ${missingScores.length} active ${missingScores.length === 1 ? "category is" : "categories are"} unscored (${missingScores.map(getCategoryLabel).join(", ")})`
      : `Score every active category (${missingScores.length} remaining: ${missingScores.map(getCategoryLabel).join(", ")})`;

  return [
    {
      label: metadataMissing.length === 0
        ? metadataLabel
        : `Complete required fields (${metadataMissing.join(", ")} missing)`,
      complete: metadataMissing.length === 0,
    },
    {
      label: scoreLabel,
      complete: missingScores.length === 0,
    },
    {
      label: isExternal ? "Founder coachability (optional)" : "Founder coachability",
      complete: isExternal || !missingCommentary.includes("Founder coachability"),
    },
    {
      label: isExternal ? "Startup interest (optional)" : "Startup interest",
      complete: isExternal || !missingCommentary.includes("Startup interest"),
    },
    {
      label: isExternal
        ? "Call notes, milestone ideas, and task ideas (optional)"
        : "Call notes, milestone ideas, and task ideas",
      complete: isExternal || !missingCommentary.includes("Call notes, milestone ideas, and task ideas"),
    },
  ];
}
