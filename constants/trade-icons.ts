import type { ImageSourcePropType } from 'react-native';
import type { TradeCategory } from '@/constants/trade-categories';

export const TRADE_ICON_SOURCES: Record<TradeCategory, ImageSourcePropType> = {
  electrical: require('@/assets/images/trade-icons/electrical.png'),
  building: require('@/assets/images/trade-icons/building.png'),
  plumbing: require('@/assets/images/trade-icons/plumbing.png'),
  landscaping: require('@/assets/images/trade-icons/landscaping.png'),
  roofing: require('@/assets/images/trade-icons/roofing.png'),
  tiling: require('@/assets/images/trade-icons/tiling.png'),
  flooring: require('@/assets/images/trade-icons/flooring.png'),
  carpentry: require('@/assets/images/trade-icons/carpentry.png'),
  solar: require('@/assets/images/trade-icons/solar.png'),
};
