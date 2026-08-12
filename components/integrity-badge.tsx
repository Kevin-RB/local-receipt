import { BadgeAlert, FileCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";

export const IntegrityBadge = ({ hasWarning }: { hasWarning: boolean }) =>
  hasWarning ? (
    <Badge variant="destructive">
      <BadgeAlert data-icon="inline-start" />
      Integrity Warning
    </Badge>
  ) : (
    <Badge variant="ghost">
      <FileCheck data-icon="inline-start" />
      Matching
    </Badge>
  );
