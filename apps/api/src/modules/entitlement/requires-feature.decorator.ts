import { SetMetadata } from '@nestjs/common';

export const FEATURE_KEY_METADATA = 'feature_key';
export const RequiresFeature = (featureKey: string) =>
  SetMetadata(FEATURE_KEY_METADATA, featureKey);
