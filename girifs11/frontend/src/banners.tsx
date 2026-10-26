import type { ReactNode } from "react";
import type { Scenario } from "./types";

export interface BannerInfo { node: ReactNode; voice: string; showRange: boolean; }

export function bannerFor(sc: Scenario): BannerInfo {
  switch (sc) {
    case "emergency":
      return { showRange: true, voice: "🔊 Manual calling in effect if needed — emergency in progress.",
        node: <div className="banner red pulse"><span className="icon">🚨</span><div><b>Emergency case prioritized</b><p>Queue order temporarily adjusted. Waiting range has been widened.</p></div></div> };
    case "delay":
      return { showRange: true, voice: "🔊 Slight delay — estimate updated automatically.",
        node: <div className="banner amber"><span className="icon">⏱️</span><div><b>Delay detected</b><p>Current token hasn't changed in a while — estimate auto-adjusted, staff notified.</p></div></div> };
    case "near_turn":
      return { showRange: true, voice: "🔊 \"Please proceed shortly.\" (regional language available)",
        node: <div className="banner green pulse"><span className="icon">🔔</span><div><b>You're next — about 5 min left</b><p>Please be near the consultation room now.</p></div></div> };
    case "offline":
      return { showRange: false, voice: "🔊 Manual calling in effect — listen for staff announcement.",
        node: <div className="banner gray"><span className="icon">📡</span><div><b>Live system offline</b><p>Falling back to manual token calling. Please listen for your number.</p></div></div> };
    case "your_turn":
      return { showRange: false, voice: "🔊 \"Please proceed to the consultation room.\"",
        node: <div className="banner green pulse"><span className="icon">🎉</span><div><b>It's your turn now!</b><p>Please proceed to the consultation room.</p></div></div> };
    case "completed":
      return { showRange: false, voice: "🔊 Consultation completed. Thank you.",
        node: <div className="banner gray"><span className="icon">✅</span><div><b>Consultation completed</b><p>This token is finished. Thank you for waiting.</p></div></div> };
    default:
      return { showRange: true, voice: "🔊 \"Token, please proceed.\" (regional language available)",
        node: <div className="banner green"><span className="icon">✅</span><div><b>Queue running normally</b><p>Estimate is live and updating automatically.</p></div></div> };
  }
}
