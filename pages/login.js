import { useState } from "react";
import { useRouter } from "next/router";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../lib/firebaseConfig";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  // Login function
  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.replace("/home"); // Redirect to home after successful login
    } catch (err) {
      setError("Invalid email or password!");
    }
  };

  return (
    <div className="container">
      <div className="card">
        <h1 className="title">Login</h1>

        {error && <p className="error-message">{error}</p>}

        <div className="input-group">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
          />
        </div>

        <div className="input-group">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
          />
          <button
            onClick={() => setShowPassword(!showPassword)}
            style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <Image
              src={showPassword ? "/assets/eye-off.png" : "/assets/eye.png"}
              alt="Toggle Password Visibility"
              width={20}
              height={20}
            />
          </button>
        </div>

        <button onClick={handleLogin} className="button">
          Login
        </button>

        <a className="link" onClick={() => router.push("/signup")}>
          Don't have an account? Sign up
        </a>
      </div>
    </div>
  );
}
