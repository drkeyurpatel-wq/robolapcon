export function RoboLapConLogo({ size = 80, className = '' }: { size?: number; className?: string }) {
  const s = size / 80;
  return (
    <svg
      width={130 * s}
      height={130 * s}
      viewBox="0 0 130 130"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <g transform="translate(65, 65)">
        {/* Hex = abdominal wall */}
        <polygon
          points="0,-58 50,-29 50,29 0,58 -50,29 -50,-29"
          fill="none"
          stroke="#00A99D"
          strokeWidth="1.6"
        />
        {/* Inner hex depth */}
        <polygon
          points="0,-40 35,-20 35,20 0,40 -35,20 -35,-20"
          fill="none"
          stroke="#00A99D"
          strokeWidth="0.4"
          opacity={0.2}
        />
        {/* Top trocar — camera port */}
        <circle cx={0} cy={-58} r={6.5} fill="#00A99D" />
        <circle cx={0} cy={-58} r={2.8} fill="#5eead4" />
        {/* Right upper — working port with joint ring */}
        <circle cx={50} cy={-29} r={5} fill="#00A99D" />
        <circle cx={50} cy={-29} r={2} fill="#5eead4" />
        <circle cx={50} cy={-29} r={9} fill="none" stroke="#00A99D" strokeWidth="0.6" opacity={0.4} />
        {/* Left upper — working port with joint ring */}
        <circle cx={-50} cy={-29} r={5} fill="#00A99D" />
        <circle cx={-50} cy={-29} r={2} fill="#5eead4" />
        <circle cx={-50} cy={-29} r={9} fill="none" stroke="#00A99D" strokeWidth="0.6" opacity={0.4} />
        {/* Bottom ports — amber */}
        <circle cx={50} cy={29} r={3.5} fill="#FDB913" />
        <circle cx={-50} cy={29} r={3.5} fill="#FDB913" />
        <circle cx={0} cy={58} r={3.5} fill="#FDB913" />
        {/* Instrument paths — dashed */}
        <line x1={0} y1={-58} x2={0} y2={-7} stroke="#00A99D" strokeWidth="0.7" strokeDasharray="3 2" opacity={0.45} />
        <line x1={50} y1={-29} x2={7} y2={-3} stroke="#00A99D" strokeWidth="0.7" strokeDasharray="3 2" opacity={0.45} />
        <line x1={-50} y1={-29} x2={-7} y2={-3} stroke="#00A99D" strokeWidth="0.7" strokeDasharray="3 2" opacity={0.45} />
        {/* Operative field crosshair */}
        <circle cx={0} cy={0} r={4.5} fill="none" stroke="#00A99D" strokeWidth="1" />
        <line x1={-9} y1={0} x2={9} y2={0} stroke="#00A99D" strokeWidth="0.5" opacity={0.6} />
        <line x1={0} y1={-9} x2={0} y2={9} stroke="#00A99D" strokeWidth="0.5" opacity={0.6} />
      </g>
    </svg>
  );
}

export function RoboLapConWordmark({ className = '' }: { className?: string }) {
  return (
    <div className={className}>
      <div className="flex items-baseline gap-0">
        <span className="text-rlc-accent font-black tracking-tight">RoboLap</span>
        <span className="text-rlc-amber font-black tracking-tight">Con</span>
      </div>
    </div>
  );
}

export function RoboLapConFullLogo({ size = 80, className = '' }: { size?: number; className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <RoboLapConLogo size={size} />
      <div>
        <div className="flex items-baseline">
          <span className="text-rlc-accent font-black tracking-tight" style={{ fontSize: size * 0.35 }}>RoboLap</span>
          <span className="text-rlc-amber font-black tracking-tight" style={{ fontSize: size * 0.35 }}>Con</span>
        </div>
        <div className="text-white font-bold tracking-[0.25em]" style={{ fontSize: size * 0.16 }}>2026</div>
        <div className="text-rlc-muted tracking-[0.12em]" style={{ fontSize: size * 0.1 }}>A HEALTH1 INITIATIVE</div>
      </div>
    </div>
  );
}
