# Solana-SPL-Token-PnL-Calculator

## Overview

This project is a Solana SPL Token Profit and Loss (PnL) Calculator that allows users to calculate their unrealized gains or losses on Solana tokens.

## Getting Started

To run the code, follow these steps:
1. **Install Dependencies**
    ```bash
    npm install

1. **Start the application**
   ```bash
   npm start

3. **Running Tests**
To run the core test file( I wrote only for one due to time constraint):
    ```bash
    npx jest app/helpers/processData.test.ts

The code entry point is ./app/server/server.ts.
All Solana calls are localised in ./app/solana directory.
All processing is localised in ./app/helpers.
All Updateable configs are localised in ./app/config.


npm start enters the code in ./app/server/server.ts


Note: RPC endpoint can fail , if it does, please rerun the code or change the rpc url in ./app/config/config.json


## Considerations
As for the scope of the current project, following are the considerations.

1. As the fetched token data is from raydium and we are taking the price compared to usdt, it is taken that the spl token have a pair initialised with usdt on raydium.
2. The rpc endpoint are working, because I have observed it ooften fails, you can change the rpc endpoint to another one if you have like helius.
3. To fetch transaction data from rpc in batches, there is a key in config.json by the name of "transaction_batch_size". This is currectly set as 1 because the public rpc does not allow batched requests. You can change it to support batching.
4. The raydium pool id: 3nMFwZXwY1s1M5s8vYAHqd4wGs4iSxXE4LRoUMMYqEgF is used to fetch SOL token price as compared to USDT.
5. If the associated token address for the particular token for user public key is not foundd, the code will automatically stop.
6. The addition and subtraction can also be changed to bignumber operations in case we observe buffers in calculations.
7. The code will look for basic transfers for the public key.