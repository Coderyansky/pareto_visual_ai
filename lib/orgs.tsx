import {
  siAnthropic,
  siBytedance,
  siDeepseek,
  siGooglegemini,
  siKimi,
  siMeta,
  siMinimax,
  siMistralai,
  siQwen,
  siX,
  siXiaomi,
  type SimpleIcon,
} from "simple-icons";

const ORG_ICONS: Record<string, SimpleIcon> = {
  Anthropic: siAnthropic,
  Google: siGooglegemini,
  Alibaba: siQwen,
  DeepSeek: siDeepseek,
  SpaceXAI: siX,
  Moonshot: siKimi,
  Xiaomi: siXiaomi,
  Meta: siMeta,
  MiniMax: siMinimax,
  Mistral: siMistralai,
  Bytedance: siBytedance,
};

/** Monochrome organization mark: brand glyph when available, otherwise a mono monogram. */
export function OrgMark({ org, size = 14, className }: { org: string; size?: number; className?: string }) {
  const icon = ORG_ICONS[org];
  if (icon) {
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-label={org} role="img" className={className}>
        <path d={icon.path} />
      </svg>
    );
  }
  return (
    <span
      aria-label={org}
      role="img"
      className={className}
      style={{ fontSize: size * 0.72, lineHeight: 1, width: size, height: size }}
    >
      <span className="flex h-full w-full items-center justify-center font-mono font-semibold tracking-tight">
        {monogram(org)}
      </span>
    </span>
  );
}

/** Up to two capitals of the name: `OpenAI` → `OA`, `Z.ai` → `Z`, `Inception AI` → `IA`. */
function monogram(org: string): string {
  const capitals = org.match(/[A-Z0-9]/g);
  return (capitals?.slice(0, 2).join("") || org.slice(0, 1)).toUpperCase();
}
