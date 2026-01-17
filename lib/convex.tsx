import { ConvexProvider, ConvexReactClient } from "convex/react";
import { useAuth } from "@clerk/clerk-expo";
import { ConvexProviderWithClerk } from "convex/react-clerk";

const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL;

if (!convexUrl) {
  console.warn("Missing EXPO_PUBLIC_CONVEX_URL - database will not work");
}

const convex = new ConvexReactClient(convexUrl ?? "");

export function ConvexClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      {children}
    </ConvexProviderWithClerk>
  );
}

export { convex };

