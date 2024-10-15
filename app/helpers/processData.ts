import { getTokenTransactions, getCurrentPrice, getHistoricalPrices, getHistoricalSOLPrice } from '../solana';
import { config } from '../config';


export async function processData(token: string, walletAddress: string) {
    try {
        console.log("[processData]");

        const [transactionData, currentPrice, currentSolPrice] = await Promise.all([getTokenTransactions(walletAddress, token), getCurrentPrice(token), getCurrentPrice(config?.sol_address)]);
        if (transactionData.length === 0 || currentPrice.price === -1) {
            console.log("Error in the process");
            return;
        }
        let totalBought = 0;
        let totalSold = 0;
        let totalFees = 0;
        let costBasis = 0;

        for (const transfer of transactionData) {
            let historicalPrice = await getHistoricalPrices(token, transfer.slot, currentPrice.poolId);
            let historicalSOLPrice = await getHistoricalSOLPrice(transfer.slot);
            if(historicalPrice === -1) {
                console.log(`Error in getting historical price for slot: ${transfer.slot}, using current price`);
                historicalPrice = currentPrice.price;
            }
            if(historicalSOLPrice === -1) {
                console.log(`Error in getting historical SOL price for slot: ${transfer.slot}, using current SOL price`);
                historicalSOLPrice = currentSolPrice.price;
            }
            if (transfer.type === "buy") {
                totalBought += transfer.amount;
                costBasis += transfer.amount * historicalPrice;
            } else {
                totalSold += transfer.amount;
                costBasis -= transfer.amount * historicalPrice;
            }
            totalFees += (transfer.fee * historicalSOLPrice);
        };

        const totalTokensHeld = totalBought - totalSold;
        const currentValue = totalTokensHeld * currentPrice.price;
        const unrealizedPnL = currentValue - costBasis - totalFees;

        console.log(`Total tokens held: ${totalTokensHeld}`);
        console.log(`Total purchase amount (cost basis): ${costBasis}`);
        console.log(`Current value of holdings: ${currentValue}`);
        console.log(`Unrealized PnL: ${unrealizedPnL}`);
        return;
    } catch (err) {
        console.log("Error in [processData]: ", err);
        return;
    }
}