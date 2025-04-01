import { useEffect } from "react";
import { useRouter } from "next/router";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { auth } from "../lib/firebaseConfig";

export default function Home() {
  const router = useRouter();

  // Check if user is authenticated, if not redirect to login page
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.replace("/login"); // Redirect to login if not authenticated
      }
    });
    return () => unsubscribe();
  }, [router]);

  // Logout function
  const handleLogout = async () => {
    await signOut(auth);
    router.replace("/login"); // Redirect after logout
  };

  return (
    <div className="container">
      <div className="card">
        <h1 className="title">Welcome!</h1>
        <p className="welcome-text">This is your home page. We'll update it soon!</p>

        <div className="button-group">
          <button onClick={handleLogout} className="button button-danger">
            Logout
          </button>

          <button onClick={() => router.push("/")} className="button">
            Go to Landing Page
          </button>
        </div>
      </div>
    </div>
  );
}
