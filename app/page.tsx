'use client';
import Image from "next/image";
import { useState } from "react";

export default function Home() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [enabled, setEnabled] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await fetch('/api/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    })
    setUsername("");
    setPassword("");
    setEnabled(false);
  }
  function isFormEmpty() {
    return !username || !password;
  }

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
      </main>
    </div>
  );
}
