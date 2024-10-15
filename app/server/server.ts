import { getInput, closeInput } from '../helpers/input';
import { processData } from '../helpers/processData';

async function main() {
    const tokenAddress = await getInput("Enter SPL token Address: ");
    const walletAddress = await getInput("Enter Wallet Address: ");

    // console.log(`You entered: Token Address = ${tokenAddress}, Wallet Address = ${walletAddress}`);

    closeInput();
    await processData(tokenAddress, walletAddress);
}

main();
