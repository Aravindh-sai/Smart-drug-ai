import { useState } from "react";
import { useRouter } from "next/router";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../lib/firebaseConfig";
import { doc, setDoc } from "firebase/firestore";
import Image from "next/image";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");

  const handleSignup = async () => {
    try {
      if (!name.trim()) {
        setError("Please enter your name");
        return;
      }

      if (password !== confirmPassword) {
        setError("Passwords do not match!");
        return;
      }

      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Store additional user data in Firestore
      await setDoc(doc(db, "users", userCredential.user.uid), {
        name: name.trim(),
        email: email,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
      });

      // Redirect to HealthAnalysis page instead of home
      router.replace("/HealthAnalysis");
    } catch (err) {
      setError("Error creating account. Please try again.");
    }
  };

  return (
    <div className="container">
      <div className="card">
        <h1 className="title">Sign Up</h1>

        {error && <p className="error-message">{error}</p>}

        <div className="input-group">
          <input
            type="text"
            placeholder="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
            required
          />
        </div>

        <div className="input-group">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
            required
          />
        </div>

        <div className="input-group">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
            required
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

        <div className="input-group">
          <input
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="input"
            required
          />
          <button
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <Image
              src={showConfirmPassword ? "/assets/eye-off.png" : "/assets/eye.png"}
              alt="Toggle Password Visibility"
              width={20}
              height={20}
            />
          </button>
        </div>

        <button onClick={handleSignup} className="button">
          Sign Up
        </button>

        <a className="link" onClick={() => router.push("/login")}>
          Already have an account? Login
        </a>
      </div>
    </div>
  );
}
