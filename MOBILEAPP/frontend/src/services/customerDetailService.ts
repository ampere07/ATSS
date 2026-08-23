import apiClient from '../config/api';

export interface CustomerDetailData {
  id: number;
  firstName: string;
  middleInitial?: string;
  lastName: string;
  fullName: string;
  emailAddress?: string;
  contactNumberPrimary: string;
  contactNumberSecondary?: string;
  address: string;
  barangay?: string;
  city?: string;
  region?: string;
  addressCoordinates?: string;
  housingStatus?: string;
  referredBy?: string;
  desiredPlan?: string;
  houseFrontPictureUrl?: string;
  proof_of_billing_url?: string;
  proofOfBillingUrl?: string;
  government_valid_id_url?: string;
  governmentValidIdUrl?: string;
  second_government_valid_id_url?: string;
  secondGovernmentValidIdUrl?: string;
  document_attachment_url?: string;
  documentAttachmentUrl?: string;
  other_isp_bill_url?: string;
  otherIspBillUrl?: string;
  groupId?: number;
  groupName?: string;

  billingAccount?: {
    id: number;
    accountNo: string;
    dateInstalled?: string;
    billingDay: number;
    billingStatusId: number;
    billingStatusName?: string;
    accountBalance: number;
    balanceUpdateDate?: string;
  };

  technicalDetails?: {
    id: number;
    username?: string;
    usernameStatus?: string;
    connectionType?: string;
    routerModel?: string;
    routerModemSn?: string;
    ipAddress?: string;
    lcp?: string;
    nap?: string;
    port?: string;
    vlan?: string;
    lcpnap?: string;
    usageTypeId?: number;
    usageType?: string;
  };

  createdAt?: string;
  updatedAt?: string;
  onlineSessionStatus?: string;
  onlineStatusData?: any;
}

interface CustomerDetailApiResponse {
  success: boolean;
  data?: CustomerDetailData;
  message?: string;
}

/**
 * Everything the dashboard's balance card and Pay Now button need, and nothing else.
 * Three indexed single-row reads on the server against getCustomerDetail's four
 * eager-loaded relations and two payment SUMs, so the amount due no longer queues behind
 * data that belongs to other screens.
 */
export interface CustomerPaySummary {
  accountNo: string;
  accountBalance: number;
  balanceUpdateDate: string | null;
  /** Carried so the due date can still fall back to the billing day with no invoice. */
  billingDay: number | null;
  dueDate: string | null;
  /**
   * Whether a payment is already in progress, which is all the button label needs. The
   * payment URL is deliberately not part of this response — handlePayNow re-checks and
   * gets it on tap, so a live payment link is not handed out just to render a label.
   */
  hasPendingPayment: boolean;
}

interface CustomerPaySummaryApiResponse {
  success: boolean;
  data?: CustomerPaySummary;
  message?: string;
}

/**
 * Null on any failure, matching getCustomerDetail: the caller falls back to the balance
 * carried on the full detail payload, so losing the fast path costs speed rather than
 * the ability to pay.
 */
export const getCustomerPaySummary = async (accountNo: string): Promise<CustomerPaySummary | null> => {
  try {
    const response = await apiClient.get<CustomerPaySummaryApiResponse>(
      `/customer-detail/${accountNo}/pay-summary`
    );

    if (response.data?.success && response.data?.data) {
      return response.data.data;
    }

    return null;
  } catch (error) {
    console.error('Error fetching customer pay summary:', error);
    return null;
  }
};

export const getCustomerDetail = async (accountNo: string): Promise<CustomerDetailData | null> => {
  try {
    console.log('Fetching customer detail for account:', accountNo);
    const response = await apiClient.get<CustomerDetailApiResponse>(`/customer-detail/${accountNo}`);

    console.log('Customer detail API response:', response.data);

    if (response.data?.success && response.data?.data) {
      const data = response.data.data;
      console.log('House front picture URL from API:', data.houseFrontPictureUrl);
      return data;
    }

    return null;
  } catch (error) {
    console.error('Error fetching customer detail:', error);
    return null;
  }
};
