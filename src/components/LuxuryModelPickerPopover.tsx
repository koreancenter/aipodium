import {
  InlineModelSelector,
  LuxuryModelPickerPopoverProps,
  InlineModelSelectorProps,
  ModelOptionItem,
  DEFAULT_LOCAL_TAGS,
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
  DEFAULT_LOCAL_TAGS,
  getVendorForModel,
  getVendorDisplayName,
  getModelTierBadge,
  getModelDescription,
  InlineModelSelector,
};

export const LuxuryModelPickerPopover = InlineModelSelector;
export default LuxuryModelPickerPopover;
