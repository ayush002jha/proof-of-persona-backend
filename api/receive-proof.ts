// api/receive-proof.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyProof } from '@reclaimprotocol/js-sdk';
import { SigningCosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";

const DOCUSTORE_CONTRACT_ADDRESS = process.env.DOCUSTORE_CONTRACT_ADDRESS!;
const ADMIN_MNEMONIC = process.env.ADMIN_MNEMONIC!;
const XION_RPC_ENDPOINT = "https://rpc.xion-testnet-2.burnt.com";

export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        const proof = req.body;

        const isProofValid = await verifyProof(proof);
        if (!isProofValid) {
            return res.status(400).send('Invalid proof');
        }

        const userAddress = proof.context.contextAddress;

        // 1. READ existing persona data from the blockchain
        const readOnlyClient = await SigningCosmWasmClient.connect(XION_RPC_ENDPOINT);
        let existingPersona = {};
        try {
            const queryResponse = await readOnlyClient.queryContractSmart(DOCUSTORE_CONTRACT_ADDRESS, {
                read: { collection: "personas", document_id: userAddress },
            });
            if (queryResponse.data) {
                existingPersona = JSON.parse(queryResponse.data);
            }
        } catch (e) { /* It's okay if it fails; means no document exists yet. */ }

        let newData = {};

        // 2. PROCESS proof data based on the provider (SCALABLE LOGIC)
        switch (proof.providerId) {
            case '8ce3c937-b5d7-4034-8b65-92633011904a': // GitHub
                newData = { github: { contributions: parseInt(proof.claimData.context.extractedParameters.contributionsInLastYear) }};
                break;
            case 'e6fe962d-8b4e-4ce5-abcc-3d21c88bd64a': // Twitter / X
                newData = { twitter: { followers: parseInt(proof.claimData.context.extractedParameters.followersCount) }};
                break;
            case '35a78b54-fe75-474e-89a6-5a815121b2': // Binance
                newData = { binance: { kycLevel: proof.claimData.context.extractedParameters.kycLevel }};
                break;
            default:
                return res.status(400).send('Unsupported provider');
        }
        
        // 3. MERGE new data with existing data
        const updatedPersona = { ...existingPersona, ...newData, lastUpdatedAt: new Date().toISOString() };

        const writeMsg = { write: { collection: "personas", document_id: userAddress, data: JSON.stringify(updatedPersona) } };

        // 4. WRITE the updated data to the blockchain
        const wallet = await DirectSecp256k1HdWallet.fromMnemonic(ADMIN_MNEMONIC, { prefix: "xion" });
        const signingClient = await SigningCosmWasmClient.connectWithSigner(XION_RPC_ENDPOINT, wallet);
        const [firstAccount] = await wallet.getAccounts();

        const result = await signingClient.execute(firstAccount.address, DOCUSTORE_CONTRACT_ADDRESS, writeMsg, "auto");

        res.status(200).json({ success: true, transactionHash: result.transactionHash });

    } catch (error) {
        console.error("Error processing proof:", error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};