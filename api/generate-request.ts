// api/generate-request.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ReclaimProofRequest } from "@reclaimprotocol/js-sdk";

// These are loaded securely from Vercel's environment variables
const APP_ID = process.env.RECLAIM_APP_ID!;
const APP_SECRET = process.env.RECLAIM_APP_SECRET!;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { providerId, userAddress } = req.query;

    if (!providerId || !userAddress) {
      return res
        .status(400)
        .json({ error: "providerId and userAddress are required" });
    }

    // CORRECT WAY TO INITIALIZE: Use the static .init() method.
    // This securely prepares the request on the backend using your APP_SECRET.
    const reclaimRequest = await ReclaimProofRequest.init(
      APP_ID,
      APP_SECRET,
      providerId as string
    );

    // Configure the request instance with user-specific and callback info
    reclaimRequest.addContext(
      userAddress as string,
      `Proof of Persona Verification`
    );
    const callbackUrl = `https://${req.headers.host}/api/receive-proof`;
    reclaimRequest.setAppCallbackUrl(callbackUrl);

    // CORRECT WAY TO GET THE URL: Call .getRequestUrl() on the instance.
    // This method is available after the request has been initialized.
    const reclaimUrl = reclaimRequest.getRequestUrl();

    // Send the secure, one-time-use URL back to the mobile app
    res.status(200).json({ reclaimUrl });
  } catch (error) {
    console.error("Error generating request config:", error);
    res.status(500).json({ error: "Failed to generate request config" });
  }
}
