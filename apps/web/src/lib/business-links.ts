import { BusinessTypeValue } from './business-types';

export function getBusinessPublicPath(slug: string, type?: string | null) {
  const path = type === 'RESTAURANT' || type === 'CAFE'
    ? 'r'
    : type === 'CLINIC' || type === 'HOSPITAL' || type === 'DIAGNOSTIC_CENTRE'
      ? 'c'
      : 'b';
  return `/${path}/${slug}`;
}

export function isFoodBusiness(type?: BusinessTypeValue | string | null) {
  return type === 'RESTAURANT' || type === 'CAFE';
}

export function isClinicalBusiness(type?: BusinessTypeValue | string | null) {
  return type === 'CLINIC' || type === 'HOSPITAL' || type === 'DIAGNOSTIC_CENTRE';
}
