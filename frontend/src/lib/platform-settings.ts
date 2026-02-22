import { apiRequest } from './api';

export type PublicPlatformSettings = {
  platformName: string;
  platformDescription?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  paymentGateway?: string | null;
  emailEnabled?: boolean;
  emailSender?: string | null;
};

export async function fetchPublicPlatformSettings() {
  return apiRequest<PublicPlatformSettings>('/platform-settings/public');
}
