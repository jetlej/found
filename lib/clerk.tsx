import { ClerkProvider, useAuth } from "@clerk/clerk-expo";
import { tokenCache } from "./token-cache";

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

if (!publishableKey) {
  console.warn(
    "Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY - auth will not work"
  );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider publishableKey={publishableKey ?? ""} tokenCache={tokenCache}>
      {children}
    </ClerkProvider>
  );
}

export { useAuth };

