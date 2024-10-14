import { Connection, PublicKey, ParsedTransactionMeta } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from "@solana/spl-token";
import axios from 'axios';
import { config } from '../config';

interface TokenTransfer {
    amount: number;
    type: "buy" | "sell";
}


export async function getAssociatedAccountAddress(token: string, walletAddress: string): Promise<string> {
    const tokenPubKey = new PublicKey(token);
    const walletPubKey = new PublicKey(walletAddress);
    return (await getAssociatedTokenAddress(tokenPubKey, walletPubKey)).toString();
}


export async function getCurrentPrice(token: string): Promise<number> {
    try {
        if (token === config?.usdt_address) {
            return 1;
        }
        const resp = await axios.get(`${config?.raydium_base_url}?mint1=${token}&mint2=${config?.usdt_address}&poolType=all&poolSortField=liquidity&sortType=desc&pageSize=1&page=1`)
        return resp?.data?.data?.data[0]?.price;
    } catch (err) {
        console.log("Error in [getTokenTransactions]: ", err);
        return -1;
    }
}


/**
 * Get all token transfer transactions for a specific token and user wallet in batches
 * @param walletAddress User's wallet address
 * @param token Token contract address (SPL token)
 * @returns ParsedConfirmedTransaction[]
 */
export async function getTokenTransactions(walletAddress: string, token: string): Promise<TokenTransfer[]> {
    try {
        console.log("[getTokenTransactions]");
        const connection = new Connection(config?.solana_rpc_url, 'confirmed');
        const tokenAccountAddress = await getAssociatedAccountAddress(token, walletAddress);
        if (!tokenAccountAddress) {
            console.log("Wallet address not initialised for this token");
            return [];
        }
        const walletPubKey = new PublicKey(tokenAccountAddress);

        const tokenPubKey = new PublicKey(token);
        const signatures = await connection.getSignaturesForAddress(walletPubKey);
        const signatureList = signatures.map(signatureInfo => signatureInfo.signature);
        let allTransactions: TokenTransfer[] = [];

        for (let i = 0; i < signatureList.length; i += config?.transaction_batch_size) {
            const transactions = await connection.getParsedTransactions(
                signatureList.slice(i, i + config?.transaction_batch_size),
                {
                    commitment: 'confirmed',
                    maxSupportedTransactionVersion: 0
                }
            );
            for (const transaction of transactions) {
                if (transaction) {
                    for (const instruction of transaction?.transaction?.message?.instructions) {
                        if (instruction?.programId.equals(TOKEN_PROGRAM_ID) && 'parsed' in instruction) {
                            // if (instruction?.programId.equals(TOKEN_PROGRAM_ID)) {
                            const mintAddress = new PublicKey(instruction.parsed.info.mint);
                            if (mintAddress.equals(tokenPubKey)) {
                                const amount = instruction.parsed.info.tokenAmount.uiAmount;
                                const destination = instruction.parsed.info.destination;
                                if (destination === tokenAccountAddress) {
                                    allTransactions.push({ amount, type: "buy" }); // Tokens bought
                                } else {
                                    allTransactions.push({ amount, type: "sell" }); // Tokens sold
                                }
                            }
                        }
                    }
                }

            }
        }
        return allTransactions;
    } catch (err) {
        console.log("Error in [getTokenTransactions]: ", err);
        return [];
    }
}