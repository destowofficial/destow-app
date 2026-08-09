import React from 'react';
import { HugeiconsIcon } from '@hugeicons/react-native';
import {
  PlusSignIcon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Calendar03Icon,
  CashIcon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  Tick02Icon,
  Clock01Icon,
  Home01Icon,
  InformationCircleIcon,
  Location01Icon,
  Mail01Icon,
  Menu01Icon,
  MinusSignIcon,
  Call02Icon,
  Search01Icon,
  SecurityCheckIcon,
  Settings01Icon,
  Logout01Icon,
  SmartPhone01Icon,
  StarIcon,
  UserIcon,
  HelpCircleIcon,
  Alert01Icon,
  RecordIcon,
} from '@hugeicons/core-free-icons';
import { color as tokens } from '../../theme/tokens';
import { f } from '../../theme/responsive';

// One name per thing the app draws, mapped to a Hugeicons glyph here and
// nowhere else.
//
// Screens ask for `pin` or `wallet`, not for a vendor's icon name, so swapping
// the set again is this file rather than nineteen screens. Hugeicons free is
// MIT - see the note in docs/licences.md - which is why it can sit in a
// commercial app without attribution in the UI.
const GLYPH = {
  back: ArrowLeft01Icon,
  forward: ArrowRight01Icon,
  search: Search01Icon,
  pin: Location01Icon,
  dot: RecordIcon,
  calendar: Calendar03Icon,
  clock: Clock01Icon,
  tick: Tick02Icon,
  tickCircle: CheckmarkCircle02Icon,
  cross: Cancel01Icon,
  plus: PlusSignIcon,
  minus: MinusSignIcon,
  star: StarIcon,
  phone: Call02Icon,
  wallet: CashIcon,
  info: InformationCircleIcon,
  alert: Alert01Icon,
  shield: SecurityCheckIcon,
  help: HelpCircleIcon,
  mail: Mail01Icon,
  device: SmartPhone01Icon,
  user: UserIcon,
  home: Home01Icon,
  list: Menu01Icon,
  settings: Settings01Icon,
  signOut: Logout01Icon,
} as const;

export type IconName = keyof typeof GLYPH;

export function Icon({
  name,
  size = 20,
  color = tokens.sub,
  strokeWidth,
}: {
  name: IconName;
  size?: number;
  color?: string;
  /** Heavier only where an icon has to carry on its own, like a tab bar. */
  strokeWidth?: number;
}) {
  return (
    <HugeiconsIcon
      icon={GLYPH[name]}
      size={f(size)}
      color={color}
      strokeWidth={strokeWidth ?? 1.8}
    />
  );
}
