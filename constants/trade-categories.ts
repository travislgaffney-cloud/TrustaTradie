export type TradeCategory =
  | 'electrical'
  | 'building'
  | 'plumbing'
  | 'landscaping'
  | 'roofing'
  | 'tiling';

export const TRADE_CATEGORIES: {
  value: TradeCategory;
  label: string;
  icon: string;
  description: string;
}[] = [
  {
    value: 'electrical',
    label: 'Electrical',
    icon: '⚡',
    description: 'Wiring, installations, fault finding',
  },
  {
    value: 'building',
    label: 'Building',
    icon: '🏗️',
    description: 'Construction, renovations, extensions',
  },
  {
    value: 'plumbing',
    label: 'Plumbing',
    icon: '🔧',
    description: 'Pipes, leaks, geysers, drainage',
  },
  {
    value: 'landscaping',
    label: 'Landscaping',
    icon: '🌿',
    description: 'Garden design, maintenance, irrigation',
  },
  {
    value: 'roofing',
    label: 'Roofing',
    icon: '🏠',
    description: 'Repairs, waterproofing, new roofs',
  },
  {
    value: 'tiling',
    label: 'Tiling',
    icon: '🔲',
    description: 'Floor tiles, wall tiles, grouting',
  },
];

export const SA_PROVINCES = [
  'Eastern Cape',
  'Free State',
  'Gauteng',
  'KwaZulu-Natal',
  'Limpopo',
  'Mpumalanga',
  'Northern Cape',
  'North West',
  'Western Cape',
];

export const SA_BANKS = [
  { label: 'ABSA', value: 'absa', branchCode: '632005' },
  { label: 'Capitec', value: 'capitec', branchCode: '470010' },
  { label: 'FNB (First National Bank)', value: 'fnb', branchCode: '250655' },
  { label: 'Nedbank', value: 'nedbank', branchCode: '198765' },
  { label: 'Standard Bank', value: 'standard_bank', branchCode: '051001' },
  { label: 'Investec', value: 'investec', branchCode: '580105' },
  { label: 'African Bank', value: 'african_bank', branchCode: '430000' },
  { label: 'TymeBank', value: 'tymebank', branchCode: '678910' },
  { label: 'Discovery Bank', value: 'discovery', branchCode: '679000' },
];

export const ACCOUNT_TYPES = [
  { label: 'Cheque / Current', value: 'cheque' },
  { label: 'Savings', value: 'savings' },
  { label: 'Transmission', value: 'transmission' },
];
