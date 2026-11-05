// The BH Points mark: two stacked coins, the front one stamped with a slanted "BH".
export function BhCoin({ size = 44 }: { size?: number }) {
  return <svg className="bh-coin" width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="BH Points">
    <defs>
      <linearGradient id="bh-coin-front" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f2cf9c"/><stop offset=".55" stopColor="#d39c5f"/><stop offset="1" stopColor="#a8703f"/></linearGradient>
      <linearGradient id="bh-coin-back" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#c48c55"/><stop offset="1" stopColor="#7c4f2c"/></linearGradient>
    </defs>
    <circle cx="40" cy="24" r="19" fill="url(#bh-coin-back)"/>
    <circle cx="40" cy="24" r="14.5" fill="none" stroke="#f4d9b4" strokeOpacity=".45" strokeWidth="1.2"/>
    <circle cx="26" cy="38" r="22" fill="url(#bh-coin-front)" stroke="#fff3e2" strokeOpacity=".7" strokeWidth="1.5"/>
    <circle cx="26" cy="38" r="17" fill="none" stroke="#7a4a27" strokeOpacity=".35" strokeWidth="1.2"/>
    <text x="26" y="45" textAnchor="middle" transform="rotate(-14 26 38)" fontFamily="Sora, 'DM Sans', sans-serif" fontWeight="800" fontSize="19" letterSpacing="-1.2" fill="#3a2416">BH</text>
  </svg>;
}
