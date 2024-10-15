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




The code entry point is ./app/server/server.ts
All Solana calls are localised in ./app/solana directory
All processing is localised in ./app/helpers
All Updateable configs are localised in ./app/config



npm start enters the code in ./app/server/server.ts