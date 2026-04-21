import labelData from "./labels.json" with { type: "json" };

type LabelsData = typeof labelData;
type LabelCategory = keyof LabelsData;

export const getLabel = <C extends LabelCategory>(
  category: C,
  key: C extends LabelCategory ? keyof LabelsData[C] : never,
): string => labelData[category][key] as string;
