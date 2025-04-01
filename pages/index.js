import { useEffect } from "react";
import { useRouter } from "next/router";

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/splash"); // Redirect to splash screen first
  }, [router]);

  return null;
}
