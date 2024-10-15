import { Connection, PublicKey, AccountInfo, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from "@solana/spl-token";
import { PoolInfoLayout as PoolInfoLayoutAmm } from "@raydium-io/raydium-sdk";
import { PoolInfoLayout, SqrtPriceMath } from "@raydium-io/raydium-sdk-v2";
import axios from 'axios';
import { config } from '../config';

//This is the interface defined for the transaction data for the particular spl token and user account
interface TokenTransfer {
    amount: number;
    type: "buy" | "sell";
    slot: number;
    fee: number;
    time: number;
}

//This is the interface for the Current price, pool id is returned here for fetching the historical data later on from rpc
interface CurrentPrice {
    price: number;
    poolId: string;
}


export async function getAssociatedAccountAddress(token: string, walletAddress: string): Promise<string> {
    const tokenPubKey = new PublicKey(token);
    const walletPubKey = new PublicKey(walletAddress);
    return (await getAssociatedTokenAddress(tokenPubKey, walletPubKey)).toString();
}

export async function getHistoricalPrices(token: string, blockNumber: number, poolId: string): Promise<number> {
    try {
        if (token === config?.usdt_address) {
            return 1; //case where the token is usdt only as there is not pair or usdt/usdt in raydium
        }
        const poolPubkey = new PublicKey(poolId);
        const connection = new Connection(config?.solana_rpc_url_mainnet, 'confirmed');
        const accountInfo: AccountInfo<Buffer> | null = await connection.getAccountInfo(poolPubkey, { commitment: 'confirmed', minContextSlot: blockNumber });
        if (accountInfo) {
            if(accountInfo.owner.equals(new PublicKey("CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK"))) { //clmm pool
                const decodedData = PoolInfoLayout.decode(accountInfo.data);
                console.log(decodedData)
                return Number(SqrtPriceMath.sqrtPriceX64ToPrice(decodedData.sqrtPriceX64, decodedData.mintDecimalsA, decodedData.mintDecimalsB))
            } else {
                const decodedData = PoolInfoLayoutAmm.decode(accountInfo.data); //amm pool
                return Number(SqrtPriceMath.sqrtPriceX64ToPrice(decodedData.sqrtPriceX64, decodedData.mintDecimalsA, decodedData.mintDecimalsB))
            }
            
        }

        return -1;
    } catch (err) {
        // console.log("Error in [getTokenTransactions]: ", err);
        return -1;
    }
}

export async function getHistoricalSOLPrice(blockNumber: number): Promise<number> {
    try {
        const poolPubkey = new PublicKey(config?.sol_pool_id);
        const connection = new Connection(config?.solana_rpc_url_mainnet, 'confirmed');
        const accountInfo: AccountInfo<Buffer> | null = await connection.getAccountInfo(poolPubkey, { commitment: 'confirmed', minContextSlot: blockNumber });
        if (accountInfo) {
            if(accountInfo.owner.equals(new PublicKey("CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK"))) { //clmm pool
                const decodedData = PoolInfoLayout.decode(accountInfo.data);
                console.log(decodedData)
                return Number(SqrtPriceMath.sqrtPriceX64ToPrice(decodedData.sqrtPriceX64, decodedData.mintDecimalsA, decodedData.mintDecimalsB))
            } else {
                const decodedData = PoolInfoLayoutAmm.decode(accountInfo.data); //amm pool
                return Number(SqrtPriceMath.sqrtPriceX64ToPrice(decodedData.sqrtPriceX64, decodedData.mintDecimalsA, decodedData.mintDecimalsB))
            }
            
        }
        return -1;
    } catch (err) {
        // console.log("Error in [getTokenTransactions]: ", err);
        return -1;
    }
}

//Get current price from raydium
export async function getCurrentPrice(token: string): Promise<CurrentPrice> {
    try {
        if (token === config?.usdt_address) {
            return { price: 1, poolId: "" };
        }
        const resp = await axios.get(`${config?.raydium_base_url}?mint1=${token}&mint2=${config?.usdt_address}&poolType=all&poolSortField=liquidity&sortType=desc&pageSize=1&page=1`)
        return { price: resp?.data?.data?.data[0]?.price, poolId: resp?.data?.data?.data[0]?.id };
    } catch (err) {
        console.log("Error in [getTokenTransactions]: ", err);
        return { price: -1, poolId: "" };;
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
                            const mintAddress = new PublicKey(instruction.parsed.info.mint);
                            if (mintAddress.equals(tokenPubKey)) {
                                const amount = instruction.parsed.info.tokenAmount.uiAmount;
                                const destination = instruction.parsed.info.destination;
                                if (destination === tokenAccountAddress) {
                                    allTransactions.push({ amount, type: "buy", slot: transaction?.slot, time: (transaction?.blockTime) ? (transaction?.blockTime) : 0, fee: (transaction?.meta?.fee) ? (transaction?.meta?.fee) / LAMPORTS_PER_SOL : 0 }); // Tokens bought
                                } else {
                                    allTransactions.push({ amount, type: "sell", slot: transaction?.slot, time: (transaction?.blockTime) ? (transaction?.blockTime) : 0, fee: (transaction?.meta?.fee) ? (transaction?.meta?.fee) / LAMPORTS_PER_SOL : 0 }); // Tokens sold
                                }
                            }
                        }
                    }
                }

            }
        }
        return allTransactions;
    } catch (err) {
        // console.log("Error in [getTokenTransactions]: ", err);
        return [];
    }
}