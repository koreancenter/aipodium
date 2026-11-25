import {
  InlineModelSelector,
  LuxuryModelPickerPopoverProps,
  InlineModelSelectorProps,
  ModelOptionItem,
  getVendorForModel,
  getVendorDisplayName,
  getModelTierBadge,
  getModelDescription,
} from './InlineModelSelector';

export type {
  LuxuryModelPickerPopoverProps,
  InlineModelSelectorProps,
  ModelOptionItem,
};

export {
  getVendorForModel,
  getVendorDisplayName,
  getModelTierBadge,
  getModelDescription,
  InlineModelSelector,
};

export const LuxuryModelPickerPopover = InlineModelSelector;
export default LuxuryModelPickerPopover;
