// api/generate-request.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ReclaimProofRequest } from '@reclaimprotocol/js-sdk';

// These will be loaded from Vercel's environment variables, not hardcoded
const APP_ID = process.env.RECLAIM_APP_ID!;
const APP_SECRET = process.env.RECLAIM_APP_SECRET!;

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // We expect the frontend to tell us which provider to use and for which user
    const { providerId, userAddress } = req.query;

    if (!providerId || !userAddress) {
        return res.status(400).json({ error: 'providerId and userAddress are required' });
    }

    const proofRequest = new ReclaimProofRequest(APP_ID);

    // Tell Reclaim which data provider we want to use
    await proofRequest.buildProofRequest(providerId as string);

    // Crucially, we link the eventual proof back to the user's XION address
    // This prevents someone from using their proof for another user's persona
    proofRequest.addContext(userAddress as string, `Proof of Persona Verification`);
    
    // This is the endpoint Reclaim's servers will call with the final proof
    // IMPORTANT: Update this URL after you deploy to Vercel for the first time
    const callbackUrl = `https://persona.vercel.app/api/receive-proof`;
    proofRequest.setAppCallbackUrl(callbackUrl);

    // Use the APP_SECRET securely on the backend to sign the request
    await proofRequest.reclaim.setAppSecret(APP_SECRET);
    
    const { requestUrl, statusUrl } = await proofRequest.reclaim.createVerificationRequest();

    // Send the secure, one-time-use URL back to the mobile app
    res.status(200).json({ requestUrl, statusUrl });
};