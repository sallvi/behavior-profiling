'use client';
import { useState, useEffect, useRef, useCallback } from "react";

interface MouseData {
  x: number;
  y: number;
  timestamp: number;
  velocity: number;
  acceleration: number;
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
  const [password, setPassword] = useState("");
  const [enabled, setEnabled] = useState(false);

  const [mouseData, setMouseData] = useState<MouseData[]>([]);
  const [keystrokeData, setKeystrokeData] = useState<KeystrokeData[]>([]);
  const [currentMouse, setCurrentMouse] = useState({ x: 0, y: 0 });
  const lastMouseData = useRef<MouseData | null>(null);
  const keyDownTimes = useRef<Map<string, number>>(new Map());
  const lastKeyUpTime = useRef<number>(0);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await fetch('/api/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username,
        password,
        mouseAverageVelocity: getAverageVelocity(),
        mouseAverageAcceleration: getAverageAcceleration(),
        averageDwellTime: getAverageDwellTime(),
        averageTypingSpeed: getAverageTypingSpeed()
      }),
    })
    setUsername("");
    setPassword("");
    setMouseData([]);
    setKeystrokeData([]);
    setEnabled(false);
  }
  function isFormEmpty() {
    return !username || !password;
  }

  // Mouse tracking with acceleration calculation
  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      const timestamp = Date.now();
      
      const x = event.clientX
      const y = event.clientY
      let velocity = 0;
      let acceleration = 0;

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
      }

      const newData: MouseData = { x, y, timestamp, velocity, acceleration };
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
    setMouseData([]);
    setKeystrokeData([]);
    lastMouseData.current = null;
    keyDownTimes.current.clear();
    lastKeyUpTime.current = 0;

    // // Collect device fingerprint and network info
    // setIsCollectingFingerprint(true);
    // try {
    //   const [fingerprint] = await Promise.all([collectDeviceFingerprint()]);
    //   setDeviceFingerprint(fingerprint);
    // } catch (error) {
    //   console.error("Error collecting fingerprint:", error);
    // } finally {
    //   setIsCollectingFingerprint(false);
    // }
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
        <form onSubmit={handleSubmit}>
          <input 
          value={username}
          onChange={ e =>  setUsername(e.target.value) }
          placeholder="Enter your username"
          />
          <input 
            value={password}
            type="password"
            onChange={ e => setPassword(e.target.value) }
            placeholder="Enter your password"
          />
          <hr/>
          <div className="flex gap-2 justify-end mt-4">
            <button
              type="button"
              onClick={() => setEnabled(true)}
              disabled={enabled || isFormEmpty()}
            >
              Enable Save
            </button>
            <button 
              type="submit" 
              disabled={!enabled || isFormEmpty()}
            >
              Save
            </button>
          </div>
        </form>

        <div className="flex gap-2 justify-end mt-4">    
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

          {/* Recent keystroke timings */}
          {/* {keystrokeData.length > 0 && (
            <div className="h-80 overflow-y-auto bg-zinc-50 p-2 rounded-lg text-xs">
              {keystrokeData
                .slice(-10)
                .reverse()
                .map((keystroke, index) => (
                  <div key={index} className="flex justify-between">
                    <span>&quot;{keystroke.key}&quot;</span>
                    <span>{keystroke.dwellTime}ms</span>
                  </div>
                ))}
            </div>
          )} */}
        </div>
        </div>
      </main>
    </div>
  );
}
