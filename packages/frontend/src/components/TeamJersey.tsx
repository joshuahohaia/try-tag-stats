import { useId } from 'react';
import { jerseyStyle } from '../utils/jersey';
import { useTeamKit } from '../hooks/useKits';

interface Props {
  name: string;
  /** When given, a saved shared kit for this team replaces the generated colours. */
  teamId?: number;
  /** Explicit colours (used by the editor to preview unsaved choices). Wins over a saved kit. */
  colours?: { primary: string; secondary: string };
  size?: number;
}

const TORSO = '0.26,0.16 0.74,0.16 0.76,0.44 0.76,0.94 0.24,0.94 0.24,0.44';
const SLEEVE_L = '0.26,0.16 0.03,0.28 0.10,0.50 0.26,0.44';
const SLEEVE_R = '0.74,0.16 0.97,0.28 0.90,0.50 0.74,0.44';
const CUFF_L = '0.055,0.36 0.10,0.50 0.26,0.44 0.215,0.30';
const CUFF_R = '0.945,0.36 0.90,0.50 0.74,0.44 0.785,0.30';
const V_NECK = 'M0.41,0.13 L0.59,0.13 L0.50,0.30 Z';
const CREW_NECK = 'M0.40,0.12 A0.10,0.09 0 1,0 0.60,0.12 A0.10,0.09 0 1,0 0.40,0.12 Z';

/** Team jersey drawn from the team name: same name, same jersey. Initials are dropped when tiny. */
export function TeamJersey({ name, teamId, colours, size = 32 }: Props) {
  const saved = useTeamKit(teamId);
  const kit = colours ?? saved;
  const uid = useId().replace(/:/g, '');
  const generated = jerseyStyle(name);
  const s = kit ? { ...generated, primary: kit.primary, secondary: kit.secondary, trim: kit.secondary } : generated;
  const neck = s.vNeck ? V_NECK : CREW_NECK;
  const top = 0.34;
  const bottom = 0.78;
  const span = (bottom - top) / s.hoops;
  const hoops = Array.from({ length: s.hoops }, (_, i) => ({
    y: top + i * span + span * 0.18,
    h: span * 0.64,
  }));
  return (
    <svg
      viewBox="0 0 1 1"
      width={size}
      height={size}
      role="img"
      aria-label={`${name} jersey`}
      style={{ flex: 'none', display: 'block' }}
    >
      <defs>
        <clipPath id={`${uid}-shape`}>
          <polygon points={TORSO} />
          <polygon points={SLEEVE_L} />
          <polygon points={SLEEVE_R} />
        </clipPath>
        <mask id={`${uid}-body`}>
          <rect width="1" height="1" fill="#000" />
          <g fill="#fff">
            <polygon points={TORSO} />
            <polygon points={SLEEVE_L} />
            <polygon points={SLEEVE_R} />
          </g>
          <path d={neck} fill="#000" />
        </mask>
      </defs>
      <g mask={`url(#${uid}-body)`}>
        <rect width="1" height="1" fill={s.primary} />
        {hoops.map((hp, i) => (
          <rect key={i} x="0" y={hp.y} width="1" height={hp.h} fill={s.trim} />
        ))}
        <polygon points={CUFF_L} fill={s.trim} />
        <polygon points={CUFF_R} fill={s.trim} />
        <rect x="0" y="0.88" width="1" height="0.12" fill={s.trim} />
        <g clipPath={`url(#${uid}-shape)`}>
          <path d={neck} fill="none" stroke={s.trim} strokeWidth="0.036" />
        </g>
      </g>
      {size >= 28 && (
        <>
          <text
            x="0.5"
            y="0.4158"
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="0.2"
            fontWeight="700"
            fontFamily="system-ui, sans-serif"
            fill="rgba(0,0,0,0.3)"
          >
            {s.initials}
          </text>
          <text
            x="0.5"
            y="0.41"
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="0.2"
            fontWeight="700"
            fontFamily="system-ui, sans-serif"
            fill="#fff"
          >
            {s.initials}
          </text>
        </>
      )}
    </svg>
  );
}
