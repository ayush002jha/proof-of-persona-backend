# Proof of Persona - Serverless Backend

This repository contains the secure, serverless backend for the "Proof of Persona" application, built for the XION "Proof of Concept" Hackathon. It acts as a trusted intermediary between the mobile frontend and the XION blockchain, responsible for verifying Zero-Knowledge Proofs from the Reclaim Protocol and updating a user's on-chain persona score.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fyour-github-username%2Fpersona-backend)

---

## Core Concept & Architecture

The fundamental principle of this backend is **security through separation**. The mobile frontend is considered an insecure environment where secrets cannot be stored. This backend serves as a **secure gatekeeper** that holds all the necessary secrets (API keys and wallet mnemonics) and is the only entity authorized to write verified data to the blockchain.

```mermaid
graph TD
    subgraph Insecure Environment
        A[Mobile App Frontend]
    end

    subgraph Secure Environment (This Repo on Vercel)
        B[API Endpoints]
    end
    
    subgraph External Services
        C[Reclaim Protocol]
        D[XION Blockchain]
    end

    A -- 1. Requests Verification URL --> B
    B -- 2. Uses Secrets to Generate URL --> C
    C -- 3. Returns URL to Backend --> B
    B -- 4. Sends URL to Frontend --> A
    A -- 5. User Verifies --> C
    C -- 6. Sends ZK-Proof to Backend --> B
    B -- 7. Verifies Proof & Signs Tx --> D
```

---

## Prerequisites

Before you can run this project, you will need the following:

*   **Node.js** (v18 or later)
*   **npm** or **yarn**
*   A **Vercel Account** for deployment.
*   A **Reclaim Protocol Account** to get your Application ID and Secret.
*   **XION CLI (`xiond`)** installed to create wallets.
*   Your own instance of the **DocuStore Contract** deployed on the XION Testnet.

---

## Setup & Installation

Follow these steps to get the project running locally.

### 1. Clone the Repository
```bash
git clone https://github.com/ayush002jha/proof-of-persona-backend.git
cd proof-of-persona-backend
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
This is the most critical step for getting the backend to work.

First, copy the example environment file:
```bash
cp .env.example .env
```

Now, open the `.env` file and fill in the values. **Do not commit this file to GitHub.**

```ini
# .env

# --- Reclaim Protocol Credentials ---
# Get these from your application page on dev.reclaimprotocol.org
RECLAIM_APP_ID="YOUR_RECLAIM_APP_ID"
RECLAIM_APP_SECRET="YOUR_RECLAIM_APP_SECRET"

# --- XION Blockchain Configuration ---
# The address of the DocuStore contract instance you created
DOCUSTORE_CONTRACT_ADDRESS="xion1..."

# The 24-word mnemonic for the 'persona-backend-writer' wallet.
# This wallet is used to sign transactions to the DocuStore contract.
ADMIN_MNEMONIC="word1 word2 word3 word4 ..."
```

---

## Local Development

To run the serverless functions on your local machine, use the Vercel CLI.

```bash
# This will start a local server, typically on http://localhost:3000
vercel dev
```

Your API endpoints will now be available for your mobile app to connect to during development.

---

## Deployment

This project is designed for easy deployment on **Vercel**.

1.  **Push to GitHub:** Create a GitHub repository and push your code.
2.  **Import to Vercel:** On your Vercel dashboard, click "Add New... -> Project" and import the repository you just created. Vercel will automatically detect the framework.
3.  **Configure Environment Variables:** In the Vercel project settings, navigate to "Environment Variables" and add the same key-value pairs from your `.env` file (`RECLAIM_APP_ID`, `RECLAIM_APP_SECRET`, `DOCUSTORE_CONTRACT_ADDRESS`, `ADMIN_MNEMONIC`).
4.  **Deploy:** Click the "Deploy" button.

Once deployed, remember to update the `callbackUrl` in `api/generate-request.ts` to use your new production Vercel URL.

---

## API Reference

### `GET /api/generate-request`

Securely generates a one-time verification URL from the Reclaim Protocol for the mobile app to use.

*   **Method:** `GET`
*   **Query Parameters:**
    *   `providerId` (string, required): The unique ID of the provider from the Reclaim developer portal.
    *   `userAddress` (string, required): The XION wallet address of the user initiating the request.
*   **Success Response (200 OK):**
    ```json
    {
      "reclaimUrl": "https://reclaim-react-native-sdk-left-pigeon-eh.vercel.app/?callbackId=..."
    }
    ```
*   **Error Response (400/500):**
    ```json
    {
      "error": "Descriptive error message"
    }
    ```

### `POST /api/receive-proof`

The callback endpoint that the Reclaim Protocol calls after a user successfully completes a verification. This endpoint is not meant to be called directly by the frontend.

*   **Method:** `POST`
*   **Request Body:** The raw, url-encoded ZK-Proof object from Reclaim.
*   **Core Functionality:**
    1.  Verifies the cryptographic integrity of the proof.
    2.  Reads the user's current persona from the DocuStore contract.
    3.  Identifies the provider and extracts the relevant data.
    4.  Merges the new data with the existing persona.
    5.  Signs and executes a transaction to write the updated persona back to the blockchain.
*   **Success Response (200 OK):**
    ```json
    {
      "success": true,
      "transactionHash": "A1B2C3D4..."
    }
    ```
*   **Error Response (400/500):**
    ```json
    {
      "success": false,
      "message": "Descriptive error message"
    }
    ```