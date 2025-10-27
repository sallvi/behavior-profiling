'use client';
import { useState, useEffect, useRef, useCallback } from "react";

interface MouseData {
  x: number;
  y: number;
  timestamp: number;
  velocity: number;
  acceleration: number;
  totalDistance: number;
}

interface KeystrokeData {
  key: string;
  timestamp: number;
  dwellTime: number;
  flightTime: number;
}

interface DeviceFingerprint {
  screen: {
    width: number;
    height: number;
    colorDepth: number;
    pixelRatio: number;
    availWidth: number;
    availHeight: number;
  };
  browser: {
    userAgent: string;
    language: string;
    languages: string[];
    platform: string;
    cookieEnabled: boolean;
    hardwareConcurrency: number;
    maxTouchPoints: number;
  };
  device: {
    type: string;
    browser: string;
  };
  timezone: {
    offset: number;
    name: string;
  };
}



export default function Home() {
  const [username, setUsername] = useState("");
  const [contract, setContract] = useState("");
  const [password, setPassword] = useState("");
  const [enabled, setEnabled] = useState(false);
  
  const [sentData, setSentData] = useState("");

  const [mouseData, setMouseData] = useState<MouseData[]>([]);
  const [keystrokeData, setKeystrokeData] = useState<KeystrokeData[]>([]);
  const [currentMouse, setCurrentMouse] = useState({ x: 0, y: 0 });
  const [deviceFingerprint, setDeviceFingerprint] = useState<DeviceFingerprint | null>(null);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  //
  const lastMouseData = useRef<MouseData | null>(null);
  const keyDownTimes = useRef<Map<string, number>>(new Map());
  const lastKeyUpTime = useRef<number>(0);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    let payload = JSON.stringify({
        username,
        contract,
        password,
        mouseAverageVelocity: getAverageVelocity(),
        mouseAverageAcceleration: getAverageAcceleration(),
        mouseTotalMovement: getTotalMovement(),
        averageDwellTime: getAverageDwellTime(),
        averageTypingSpeed: getAverageTypingSpeed(),
        device: deviceFingerprint?.device.type,
        browser: deviceFingerprint?.device.browser,
        screenResolution: deviceFingerprint ? `${deviceFingerprint.screen.width}x${deviceFingerprint.screen.height}` : undefined,
        windowSize: `${windowSize.width}x${windowSize.height}`,
        timezone: deviceFingerprint?.timezone.name,
    })
    await fetch('/api/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: payload,
    })
    setUsername("");
    setContract("");
    setPassword("");
    setMouseData([]);
    setKeystrokeData([]);
    setEnabled(false);
    setSentData(payload);
  }
  function isFormEmpty() {
    return !username || !contract;
  }
  function isForm2Empty() {
    return !password
  }

  // Mouse tracking with acceleration calculation
  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      const timestamp = Date.now();
      
      const x = event.clientX
      const y = event.clientY
      let velocity = 0;
      let acceleration = 0;
      let totalDistance = 0;

      if (lastMouseData.current) {
        const deltaTime = timestamp - lastMouseData.current.timestamp;
        const deltaX = x - lastMouseData.current.x;
        const deltaY = y - lastMouseData.current.y;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        // Convert to per-second units (deltaTime is in milliseconds)
        velocity = deltaTime > 0 ? (distance / deltaTime) * 1000 : 0;
        acceleration =
          deltaTime > 0
            ? ((velocity - lastMouseData.current.velocity) / deltaTime) * 1000
            : 0;
        totalDistance = lastMouseData.current.totalDistance + distance;
      }

      const newData: MouseData = { x, y, timestamp, velocity, acceleration, totalDistance };
      lastMouseData.current = newData;

      setCurrentMouse({ x, y });
      setMouseData((prev) => [...prev.slice(-1000), newData]); // Keep last 150 points
    },
    []
  );
  // Keystroke pattern analysis
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const key = event.key;
      const timestamp = Date.now();
      if (!keyDownTimes.current.has(key)) {
        keyDownTimes.current.set(key, timestamp);
      }
      console.log("Key down: ", keyDownTimes, timestamp);
    },
    [true]
  );
  const handleKeyUp = useCallback(
    (event: KeyboardEvent) => {
      const key = event.key;
      const timestamp = Date.now();
      const keyDownTime = keyDownTimes.current.get(key);

      if (keyDownTime) {
        const dwellTime = timestamp - keyDownTime;

        const flightTime =
          lastKeyUpTime.current > 0 ? keyDownTime - lastKeyUpTime.current : 0;

        const newKeystroke: KeystrokeData = {
          key,
          timestamp,
          dwellTime,
          flightTime,
        };

        setKeystrokeData((prev) => [...prev.slice(-149), newKeystroke]); // Keep last 150 keystrokes
        keyDownTimes.current.delete(key);
        lastKeyUpTime.current = timestamp;
      }
    },
    []
  );

  const parseDeviceInfo = (userAgent: string) => {
    const ua = userAgent.toLowerCase();

    // Detect browser
    let browser = "Unknown Browser";
    if (ua.includes("chrome") && !ua.includes("edg") && !ua.includes("opr")) {
      browser = "Google Chrome";
    } else if (ua.includes("firefox")) {
      browser = "Mozilla Firefox";
    } else if (ua.includes("safari") && !ua.includes("chrome")) {
      browser = "Safari";
    } else if (ua.includes("edg")) {
      browser = "Microsoft Edge";
    } else if (ua.includes("opr") || ua.includes("opera")) {
      browser = "Opera";
    }

    // Detect device type
    let deviceType = "Desktop";
    if (
      ua.includes("mobile") ||
      ua.includes("iphone") ||
      ua.includes("android")
    ) {
      deviceType = "Mobile";
    } else if (ua.includes("tablet") || ua.includes("ipad")) {
      deviceType = "Tablet";
    }

    return {
      type: deviceType,
      browser,
    };
  };

  const collectDeviceFingerprint = async (): Promise<DeviceFingerprint> => {
    const screen = {
      width: window.screen.width,
      height: window.screen.height,
      colorDepth: window.screen.colorDepth,
      pixelRatio: window.devicePixelRatio,
      availWidth: window.screen.availWidth,
      availHeight: window.screen.availHeight,
    };

    const browser = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      languages: [...navigator.languages],
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled,
      doNotTrack: navigator.doNotTrack,
      hardwareConcurrency: navigator.hardwareConcurrency || 0,
      maxTouchPoints: navigator.maxTouchPoints || 0,
    };

    const device = parseDeviceInfo(navigator.userAgent);

    const timezone = {
      offset: new Date().getTimezoneOffset(),
      name: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };

    return {
      screen,
      browser,
      device,
      timezone,
    };
  };

  const getAverageVelocity = () => {
    if (mouseData.length === 0) return 0;
    const sum = mouseData.reduce((acc, data) => acc + data.velocity, 0);
    return (sum / mouseData.length).toFixed(2);
  };
  const getAverageAcceleration = () => {
    if (mouseData.length === 0) return 0;
    const sum = mouseData.reduce(
      (acc, data) => acc + Math.abs(data.acceleration),
      0
    );
    return (sum / mouseData.length).toFixed(2);
  };
  const getTotalMovement = () => {
    if (mouseData.length === 0) return 0;
    const total = mouseData[mouseData.length - 1].totalDistance;
    return total.toFixed(2);
  }
  const getAverageTypingSpeed = () => {
    console.log(keystrokeData)
    if (keystrokeData.length < 2) return 0;
    const totalTime =
      keystrokeData[keystrokeData.length - 1].timestamp -
      keystrokeData[0].timestamp;
    const wpm = (keystrokeData.length / (totalTime / 1000)) * 12; // Rough WPM calculation
    return wpm.toFixed(1);
  };
  const getAverageDwellTime = () => {
    if (keystrokeData.length === 0) return 0;
    const sum = keystrokeData.reduce((acc, data) => acc + data.dwellTime, 0);
    return (sum / keystrokeData.length).toFixed(1);
  };

  useEffect(() => {
    const updateWindowSize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    // Set initial window size
    updateWindowSize();

    // Add resize listener
    window.addEventListener("resize", updateWindowSize);

    return () => {
      window.removeEventListener("resize", updateWindowSize);
    };
  }, []);
  
  useEffect(() => {
    async function initTracking() {
      setMouseData([]);
      setKeystrokeData([]);
      lastMouseData.current = null;
      keyDownTimes.current.clear();
      lastKeyUpTime.current = 0;

      try {
        const [fingerprint] = await Promise.all([collectDeviceFingerprint()]);
        setDeviceFingerprint(fingerprint);
      } catch (error) {
        console.error("Error collecting fingerprint:", error);
      }
    }

    initTracking();
    setMouseData([]);
    setKeystrokeData([]);
    lastMouseData.current = null;
    keyDownTimes.current.clear();
    lastKeyUpTime.current = 0;
  }, []);

  // Set up event listeners for mouse/keyboard tracking
  useEffect(() => {
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
    };
  }, [handleMouseMove, handleKeyDown, handleKeyUp]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        <h1 className="text-4xl font-bold mb-8">Enter your fake login data</h1>
        <form onSubmit={handleSubmit}>
          <div>
            <input 
            value={username}
            onChange={ e =>  setUsername(e.target.value) }
            disabled={enabled}
            placeholder="Your username"
            />
            <small className="text-gray-500 text-xs">E.g. Leonardo</small>
          </div>
          <div>
            <input 
            value={contract}
            onChange={ e =>  setContract(e.target.value) }
            disabled={enabled}
            placeholder="Your contract number"
            />
            <small className="text-gray-500 text-xs">E.g. 112358</small>
          </div>
          <div className="flex gap-2 justify-end mt-4">
            <button
              type="button"
              onClick={() => setEnabled(true)}
              disabled={enabled || isFormEmpty()}
            >
              Continue
            </button>
          </div>
          <hr className={enabled ? 'disabled' : ''} />
          <div>
            <div>
              <input 
              value={password}
              type="password"
              disabled={!enabled || isFormEmpty()}
              onChange={ e => setPassword(e.target.value) }
              placeholder="Your password"
              />
              <small className="text-gray-500 text-xs">E.g. Fib1321#</small>
            </div>
          </div>
          <div className="flex gap-2 justify-end mt-4">
            <button 
              type="submit" 
              disabled={!enabled || isFormEmpty() || isForm2Empty()}
            >
              Submit
            </button>
          </div>
          <hr className={!enabled ? 'disabled' : ''} />
        </form>

        <div className="grid grid-cols-2 gap-8 mt-12 w-full text-sm">
          {/* Mouse Tracking Area */}
          <div className="space-y-3">
            <div className="text-sm space-y-1">
              <div>
                <span className="font-semibold">Position:</span>{" "}
                <span className=" tabular-nums">
                  ({currentMouse.x}, {currentMouse.y})
                </span>
              </div>
              <div>
                <span className="font-semibold">Avg Mouse Velocity:</span>{" "}
                <span className="tabular-nums">{getAverageVelocity()}</span>{" "}
                px/s
              </div>
              <div>
                <span className="font-semibold">
                  Avg Mouse Acceleration:
                </span>{" "}
                <span className="tabular-nums">
                  {getAverageAcceleration()}
                </span>{" "}
                px/s²
              </div>
              <div>
                <span className="font-semibold">
                  Total Mouse Movement:
                </span>{" "}
                <span className="tabular-nums">
                  {getTotalMovement()}
                </span>{" "}
                px
              </div>
            </div>
          </div>
          {/* Keystroke Analysis Debug */}
          <div className="space-y-3">
            <div className="text-sm space-y-1">
              <div>
                <span className="font-semibold">Typing Speed:</span> ~
                <span className="tabular-nums">
                  {getAverageTypingSpeed()}
                </span>{" "}
                WPM
              </div>
              <div>
                <span className="font-semibold">
                  Avg Keystroke Dwell Time:
                </span>{" "}
                <span className="tabular-nums">
                  {getAverageDwellTime()}
                </span>
                ms
              </div>
            </div>
          </div>
          {/* Device Fingerprinting */}
          {deviceFingerprint && (
            <div className="space-y-3">
              {/* Screen Information */}
              <div className="text-sm space-y-1">
                <div>
                  <span className="font-semibold">Device:</span>{" "}
                  {deviceFingerprint.device.type}
                </div>

                <div>
                  <span className="font-semibold">Browser:</span>{" "}
                  {deviceFingerprint.device.browser}
                </div>
                <div>
                  <span className="font-semibold">Resolution:</span>{" "}
                  {deviceFingerprint.screen.width}×
                  {deviceFingerprint.screen.height}
                </div>
                <div>
                  <span className="font-semibold">Window Size:</span>{" "}
                  {windowSize.width}×{windowSize.height}
                </div>
                <div>
                  <span className="font-semibold">Timezone:</span>{" "}
                  {deviceFingerprint.timezone.name}
                </div>
                <div>
                  <span className="font-semibold">Language:</span>{" "}
                  {deviceFingerprint.browser.language}
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-8 mt-12 w-full text-sm">
          {/* Sent Data Debug */}
         {sentData && (
            <div className="space-y-3">
              {/* Screen Information */}
              <div className="text-sm space-y-1">
                <div>
                  <span className="font-semibold">Sent Data:</span>{" "}
                  {sentData}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
