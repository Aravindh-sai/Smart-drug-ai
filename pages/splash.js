import { useEffect } from "react";
import { useRouter } from "next/router";
import { auth } from "../lib/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import Image from "next/image"; // Import Next.js Image component

export default function Splash() {
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setTimeout(() => {
        if (user) {
          router.replace("/home"); // Redirect to home if logged in
        } else {
          router.replace("/login"); // Redirect to signup if not logged in
        }
      }, 2000); // 2-second splash screen
      return () => unsubscribe();
    });
  }, [router]);

  return (
    <div className="container splash-container">
      <Image
        src="/assets/logo.jpg" // Ensure logo.png is inside the public/assets folder
        alt="App Logo"
        width={150} // Adjust width as needed
        height={150} // Adjust height as needed
        className="splash-logo"
      />
    </div>
  );
}
