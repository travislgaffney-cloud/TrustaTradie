export type TradeCategory =
  | 'electrical'
  | 'building'
  | 'plumbing'
  | 'landscaping'
  | 'roofing'
  | 'tiling'
  | 'flooring'
  | 'carpentry'
  | 'solar';

export const TRADE_CATEGORIES: {
  value: TradeCategory;
  label: string;
  description: string;
}[] = [
  {
    value: 'electrical',
    label: 'Electrical',
    description: 'Wiring, installations, fault finding',
  },
  {
    value: 'building',
    label: 'Building',
    description: 'Construction, renovations, extensions',
  },
  {
    value: 'plumbing',
    label: 'Plumbing',
    description: 'Pipes, leaks, geysers, drainage',
  },
  {
    value: 'landscaping',
    label: 'Landscaping',
    description: 'Garden design, maintenance, irrigation',
  },
  {
    value: 'roofing',
    label: 'Roofing',
    description: 'Repairs, waterproofing, new roofs',
  },
  {
    value: 'tiling',
    label: 'Tiling',
    description: 'Floor tiles, wall tiles, grouting',
  },
  {
    value: 'flooring',
    label: 'Flooring',
    description: 'Hardwood, laminate, vinyl, polishing',
  },
  {
    value: 'carpentry',
    label: 'Carpentry',
    description: 'Cupboards, built-ins, furniture, woodwork',
  },
  {
    value: 'solar',
    label: 'Solar',
    description: 'Solar panels, inverters, batteries, installation',
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
