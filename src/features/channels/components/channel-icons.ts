import {
  DiscordIcon,
  Mail01Icon,
  Megaphone01Icon,
  Message01Icon,
  NewTwitterIcon,
  SmartPhone01Icon,
  TelegramIcon,
  WhatsappIcon,
} from "@hugeicons/core-free-icons";

import type { ChannelId } from "../types/channel";
import type { IconSvgElement } from "@/shared/components/common/hugeicon";

/**
 * One icon per channel, named explicitly so only these ship. Farcaster has no
 * mark in the set, so it takes the broadcast glyph: it is a broadcast channel.
 */
export const CHANNEL_ICON: Record<ChannelId, IconSvgElement> = {
  email: Mail01Icon,
  push: SmartPhone01Icon,
  x: NewTwitterIcon,
  whatsapp: WhatsappIcon,
  sms: Message01Icon,
  telegram: TelegramIcon,
  discord: DiscordIcon,
  farcaster: Megaphone01Icon,
};
