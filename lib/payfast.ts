import CryptoJS from 'crypto-js';

const MERCHANT_ID = process.env.EXPO_PUBLIC_PAYFAST_MERCHANT_ID ?? '';
const MERCHANT_KEY = process.env.EXPO_PUBLIC_PAYFAST_MERCHANT_KEY ?? '';
const APP_SCHEME = process.env.EXPO_PUBLIC_APP_SCHEME ?? 'trustatradie';

const IS_SANDBOX = __DEV__;
const BASE_URL = IS_SANDBOX
  ? 'https://sandbox.payfast.co.za/eng/process'
  : 'https://www.payfast.co.za/eng/process';

export interface PayFastParams {
  paymentId: string;
  amountRands: number;
  itemName: string;
  customerName: string;
  customerEmail: string;
  notifyUrl: string;
}

export function buildPayFastUrl(params: PayFastParams): string {
  const data: Record<string, string> = {
    merchant_id: MERCHANT_ID,
    merchant_key: MERCHANT_KEY,
    return_url: `${APP_SCHEME}://payment/success?id=${params.paymentId}`,
    cancel_url: `${APP_SCHEME}://payment/cancel?id=${params.paymentId}`,
    notify_url: params.notifyUrl,
    name_first: params.customerName.split(' ')[0] ?? params.customerName,
    name_last: params.customerName.split(' ').slice(1).join(' ') || '',
    email_address: params.customerEmail,
    m_payment_id: params.paymentId,
    amount: params.amountRands.toFixed(2),
    item_name: params.itemName,
  };

  // Remove empty values
  Object.keys(data).forEach((k) => {
    if (!data[k]) delete data[k];
  });

  data.signature = generateMd5Signature(data);

  const query = Object.entries(data)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');

  return `${BASE_URL}?${query}`;
}

function generateMd5Signature(data: Record<string, string>): string {
  const str = Object.entries(data)
    .map(([k, v]) => `${k}=${encodeURIComponent(v).replace(/%20/g, '+')}`)
    .join('&');

  return CryptoJS.MD5(str).toString(CryptoJS.enc.Hex);
}
