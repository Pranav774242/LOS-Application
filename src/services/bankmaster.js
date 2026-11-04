import { getBankProfile } from './bankProfile';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://los-backend-at5n.onrender.com';

export function getBankMaster() {
  return getBankProfile();
}

function getOrganizationContext() {
  const storedAuthData = window.localStorage.getItem('authData');
  if (!storedAuthData) throw new Error('Verified session data is unavailable. Please sign in again.');

  let authData;
  try {
    authData = JSON.parse(storedAuthData);
  } catch {
    throw new Error('Verified session data is invalid. Please sign in again.');
  }

  const organizationId = authData.organizationId ?? authData.organization_id;
  if (organizationId === undefined || organizationId === null || organizationId === '') {
    throw new Error('Organization ID is missing from the verified session.');
  }
  return { authData, organizationId };
}

function toApiPayload(form) {
  return {
    address_type: form.addressType.trim(),
    pincode: form.pincode.trim(),
    unit_gala_name_and_number: form.address.trim(),
    street_road: form.addressLine2.trim(),
    landmark: form.landmark.trim(),
    city: form.city.trim(),
    state: form.state.trim(),
    other_bank_details: form.accounts
      .filter((account) => Object.values(account).some((value) => String(value).trim()))
      .map((account) => ({
        particulars: account.particulars.trim(),
        bank_name: account.bankName.trim(),
        account_type: account.accountType.trim(),
        account_number: account.accountNumber.trim(),
        micr_code: account.micrCode.trim(),
        ifsc_code: account.ifscCode.trim().toUpperCase()
      })),
    approval_authority: form.approvalAuthority || null,
    single_party_limit: form.singlePartyLimit === '' ? null : Number(form.singlePartyLimit),
    group_exposure_limit: form.groupExposureLimit === '' ? null : Number(form.groupExposureLimit),
    sanction_margin: form.sanctionMargin === '' ? null : Number(form.sanctionMargin),
    penalty_charge: form.penaltyCharge === '' ? null : Number(form.penaltyCharge),
    penalty_rate: form.penaltyRate === '' ? null : Number(form.penaltyRate)
  };
}

export async function updateBankMaster(form) {
  const { authData, organizationId } = getOrganizationContext();
  const baseUrl = API_BASE_URL.replace(/\/+$/, '');
  const apiBaseUrl = /\/api\/v\d+$/i.test(baseUrl) ? baseUrl : `${baseUrl}/api/v1`;
  const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
  if (authData.accessToken) headers.Authorization = `Bearer ${authData.accessToken}`;

  const response = await fetch(`${apiBaseUrl}/administration/organizations/${organizationId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(toApiPayload(form)),
    cache: 'no-store'
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || result?.success === false) {
    throw new Error(result?.message || result?.error || 'Unable to update bank details.');
  }
  return result || { message: 'Bank details updated successfully.' };
}