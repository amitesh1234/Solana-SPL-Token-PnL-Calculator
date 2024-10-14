import { getTokenTransactions, getCurrentPrice } from '../solana';



export async function processData(token: string, walletAddress: string) {
    try {
        console.log("[processData]");
        const [transactionData, currentPrice] = await Promise.all([getTokenTransactions(walletAddress, token), getCurrentPrice(token)]);
        if (transactionData.length === 0 || currentPrice === -1) {
            console.log("Error in the process");
            return;
        }
        let totalBought = 0;
        let totalSold = 0;
        transactionData.forEach(transfer => {
            if (transfer.type === "buy") {
                totalBought += transfer.amount;
            } else {
                totalSold += transfer.amount;
            }
        });

        const totalTokensHeld = totalBought - totalSold;
        const costBasis = totalBought * currentPrice; // Assuming purchase price is the current price for simplicity
        const currentValue = totalTokensHeld * currentPrice;
        const unrealizedPnL = currentValue - costBasis;

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