// src/processData.test.ts
import { processData } from './processData'; // Adjust the import path as necessary
import { getHistoricalPrices as getHistoricalPricesfromModule, getTokenTransactions as getTokenTransactionsFromModule, getCurrentPrice as getCurrentPriceFromModule } from '../solana/index'; // Import the external functions

// Mock the external functions
jest.mock('../solana/index', () => ({
    getHistoricalPrices: jest.fn(),
    getTokenTransactions: jest.fn(),
    getCurrentPrice: jest.fn(),
}));

const { getHistoricalPrices, getTokenTransactions, getCurrentPrice } = require('../solana/index');

describe('processData', () => {
    const token = 'someToken';
    const walletAddress = 'someWalletAddress';

    beforeEach(() => {
        jest.clearAllMocks(); // Clear any previous mocks
    });

    test('should calculate unrealized PnL correctly when data is valid', async () => {
        getHistoricalPrices.mockResolvedValueOnce([]); // Assuming you need this call
        getTokenTransactions.mockResolvedValueOnce([
            { type: 'buy', amount: 10, slot: 1, fee: 0.001, time: 1728927674 },
            { type: 'sell', amount: 5, slot: 2 , fee: 0.001, time: 1728927675},
        ]);
        getCurrentPrice.mockResolvedValueOnce({price: 2, poolId: "qwe"}); // Current price for the token

        const consoleSpy = jest.spyOn(console, 'log');
        await processData(token, walletAddress);

        // Validate the expected console output
        expect(consoleSpy).toHaveBeenCalledWith('Total tokens held: 5'); // 10 bought - 5 sold
        expect(consoleSpy).toHaveBeenCalledWith('Total purchase amount (cost basis): 20'); // 10 * 2
        expect(consoleSpy).toHaveBeenCalledWith('Current value of holdings: 10'); // 5 * 2
        expect(consoleSpy).toHaveBeenCalledWith('Unrealized PnL: -10'); // 10 - 20
    });

    test('should handle errors gracefully when transaction data is empty', async () => {
        getHistoricalPrices.mockResolvedValueOnce([]);
        getTokenTransactions.mockResolvedValueOnce([]); // No transactions
        getCurrentPrice.mockResolvedValueOnce(2);

        const consoleSpy = jest.spyOn(console, 'log');

        await processData(token, walletAddress);

        expect(consoleSpy).toHaveBeenCalledWith('Error in the process');
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

        expect(consoleSpy).toHaveBeenCalledWith('Error in the process');
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
