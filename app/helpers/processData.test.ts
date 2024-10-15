// src/processData.test.ts
import { processData } from './processData'; // Adjust the import path as necessary
import { getHistoricalPrices as getHistoricalPricesfromModule, getTokenTransactions as getTokenTransactionsFromModule, getCurrentPrice as getCurrentPriceFromModule, getHistoricalSOLPrice as getHistoricalSOLPriceFromModule } from '../solana/index'; // Import the external functions

// Mock the external functions
jest.mock('../solana/index', () => ({
    getHistoricalPrices: jest.fn(),
    getTokenTransactions: jest.fn(),
    getCurrentPrice: jest.fn(),
    getHistoricalSOLPrice: jest.fn()
}));

const { getHistoricalPrices, getTokenTransactions, getCurrentPrice, getHistoricalSOLPrice } = require('../solana/index');

describe('processData', () => {
    const token = 'someToken';
    const walletAddress = 'someWalletAddress';

    beforeEach(() => {
        jest.clearAllMocks(); // Clear any previous mocks
    });

    test('should calculate unrealized PnL correctly when data is valid', async () => {
        getHistoricalPrices.mockResolvedValueOnce(-1); // Assuming you need this call
        getHistoricalSOLPrice.mockResolvedValueOnce(-1);
        getHistoricalPrices.mockResolvedValueOnce(-1);
        getHistoricalSOLPrice.mockResolvedValueOnce(-1);
        getTokenTransactions.mockResolvedValueOnce([
            { type: 'buy', amount: 10, slot: 1, fee: 0.001, time: 1728927674 },
            { type: 'sell', amount: 5, slot: 2, fee: 0.001, time: 1728927675 },
        ]);
        getCurrentPrice.mockResolvedValueOnce({ price: 2, poolId: "qwe" });
        getCurrentPrice.mockResolvedValueOnce({ price: 2, poolId: "sol_pool" }); // Current price for the token

        const consoleSpy = jest.spyOn(console, 'log');
        await processData(token, walletAddress);

        // Validate the expected console output
        expect(consoleSpy).toHaveBeenCalledWith('Total tokens held: 5');
        expect(consoleSpy).toHaveBeenCalledWith('Total purchase amount (cost basis): 10');
        expect(consoleSpy).toHaveBeenCalledWith('Current value of holdings: 10');
        expect(consoleSpy).toHaveBeenCalledWith('Unrealized PnL: -0.004');
    });

    test('should calculate unrealized PnL correctly when data is valid and historical prices are also valid', async () => {
        getHistoricalPrices.mockResolvedValueOnce(1); // Assuming you need this call
        getHistoricalSOLPrice.mockResolvedValueOnce(5);
        getHistoricalPrices.mockResolvedValueOnce(-1);
        getHistoricalSOLPrice.mockResolvedValueOnce(-1);
        getTokenTransactions.mockResolvedValueOnce([
            { type: 'buy', amount: 10, slot: 1, fee: 0.001, time: 1728927674 },
            { type: 'sell', amount: 5, slot: 2, fee: 0.001, time: 1728927675 },
        ]);
        getCurrentPrice.mockResolvedValueOnce({ price: 2, poolId: "qwe" });
        getCurrentPrice.mockResolvedValueOnce({ price: 2, poolId: "sol_pool" }); // Current price for the token

        const consoleSpy = jest.spyOn(console, 'log');
        await processData(token, walletAddress);

        // Validate the expected console output
        expect(consoleSpy).toHaveBeenCalledWith('Total tokens held: 5');
        expect(consoleSpy).toHaveBeenCalledWith('Total purchase amount (cost basis): 0');
        expect(consoleSpy).toHaveBeenCalledWith('Current value of holdings: 10');
        expect(consoleSpy).toHaveBeenCalledWith('Unrealized PnL: 9.993');
    });

    test('should calculate unrealized PnL correctly when data is valid and historical prices and historical sol proces are also valid', async () => {
        getHistoricalPrices.mockResolvedValueOnce(1); // Assuming you need this call
        getHistoricalSOLPrice.mockResolvedValueOnce(5);
        getHistoricalPrices.mockResolvedValueOnce(1);
        getHistoricalSOLPrice.mockResolvedValueOnce(2);
        getTokenTransactions.mockResolvedValueOnce([
            { type: 'buy', amount: 10, slot: 1, fee: 0.001, time: 1728927674 },
            { type: 'sell', amount: 5, slot: 2, fee: 0.001, time: 1728927675 },
        ]);
        getCurrentPrice.mockResolvedValueOnce({ price: 2, poolId: "qwe" });
        getCurrentPrice.mockResolvedValueOnce({ price: 2, poolId: "sol_pool" }); // Current price for the token

        const consoleSpy = jest.spyOn(console, 'log');
        await processData(token, walletAddress);

        // Validate the expected console output
        expect(consoleSpy).toHaveBeenCalledWith('Total tokens held: 5');
        expect(consoleSpy).toHaveBeenCalledWith('Total purchase amount (cost basis): 5');
        expect(consoleSpy).toHaveBeenCalledWith('Current value of holdings: 10');
        expect(consoleSpy).toHaveBeenCalledWith('Unrealized PnL: 4.993');
    });


    test('should handle errors gracefully when transaction data is empty', async () => {
        getHistoricalPrices.mockResolvedValueOnce([]);
        getTokenTransactions.mockResolvedValueOnce([]); // No transactions
        getCurrentPrice.mockResolvedValueOnce(2);

        const consoleSpy = jest.spyOn(console, 'log');

        await processData(token, walletAddress);

        expect(consoleSpy).toHaveBeenCalledWith('Error in the process related to either token addres sor wallet address or fetcheing current sol price');
        consoleSpy.mockRestore();
    });

    test('should handle errors gracefully when current price is -1', async () => {
        getHistoricalPrices.mockResolvedValueOnce([]);
        getTokenTransactions.mockResolvedValueOnce([
            { type: 'buy', amount: 10, slot: 1 },
        ]);
        getCurrentPrice.mockResolvedValueOnce({price: -1, poolId: "qwe"}); // Invalid price

        const consoleSpy = jest.spyOn(console, 'log');

        await processData(token, walletAddress);

        expect(consoleSpy).toHaveBeenCalledWith('Error in the process related to either token addres sor wallet address or fetcheing current sol price');
        consoleSpy.mockRestore();
    });

    test('should catch and log errors from the async calls', async () => {
        const errorMessage = 'Some error occurred';
        getTokenTransactions.mockRejectedValueOnce(new Error(errorMessage)); // Simulate an error

        const consoleSpy = jest.spyOn(console, 'log');

        await processData(token, walletAddress);

        expect(consoleSpy).toHaveBeenCalledWith("Error in [processData]: ", expect.any(Error));
        expect(consoleSpy).toHaveBeenCalledWith("Error in [processData]: ", new Error(errorMessage));
        consoleSpy.mockRestore();
    });

});
