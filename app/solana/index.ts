import { Connection, PublicKey, ParsedTransactionMeta, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, AccountLayout } from "@solana/spl-token";
import { LIQUIDITY_STATE_LAYOUT_V4, PoolInfoLayout, Layout } from "@raydium-io/raydium-sdk";
import axios from 'axios';
import { config } from '../config';
import BN from 'bn.js';

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

export async function getHistoricalPrices(token: string, blockNumber: number): Promise<number> {
    try {



        if (token === config?.usdt_address) {
            return 1; //case where the token is usdt only as there is not pair or usdt/usdt in raydium
        }
        const resp = await axios.get(`${config?.raydium_base_url}?mint1=${token}&mint2=${config?.usdt_address}&poolType=all&poolSortField=liquidity&sortType=desc&pageSize=1&page=1`);

        console.log(resp?.data?.data?.data[0]);
        const poolPubkey = new PublicKey(resp?.data?.data?.data[0]?.id);
        const connection = new Connection(config?.solana_rpc_url_mainnet, 'confirmed');

        const poolAccountInfo = await connection.getAccountInfo(new PublicKey("7XawhbbxtsRcQA8KTkHT9f9nc6d69UwqCDh6U5EEbEmX"), {
            commitment: 'finalized',
        });


        if (poolAccountInfo) {
            // console.log(poolAccountInfo.data)

            const poolData = LIQUIDITY_STATE_LAYOUT_V4.decode(poolAccountInfo.data);
            console.log(poolData)
            // const baseDecimals = poolData.baseDecimal;
            // const quoteDecimals = poolData.quoteDecimal;

            // const baseLotSize = new BN(poolData.baseLotSize);
            // const quoteLotSize: BN = new BN(poolData.quoteLotSize);

            // const swapBaseInAmount: BN = (poolData.swapBaseInAmount);
            // const swapQuoteOutAmount: BN = (poolData.swapQuoteOutAmount);
            // console.log(baseDecimals.toString(), quoteDecimals.toString(), swapBaseInAmount.toString(), swapQuoteOutAmount.toString())

            // // Normalize values by decimals using BN.js
            // const normalizedSwapBaseIn: BN = swapBaseInAmount.div(new BN(10).pow(new BN(baseDecimals)));
            // const normalizedSwapQuoteOut: BN = swapQuoteOutAmount.div(new BN(10).pow(new BN(quoteDecimals)));

            // // Calculate price of the base token in quote token
            // const price: BN = normalizedSwapQuoteOut.div(normalizedSwapBaseIn);

            // console.log('Price of base token in quote token at that timestamp:', price.toString());
            return 1; // Return as string to avoid precision loss
        }

        return -1;
    } catch (err) {
        console.log("Error in [getTokenTransactions]: ", err);
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
        console.log("Error in [getTokenTransactions]: ", err);
        return [];
    }
}